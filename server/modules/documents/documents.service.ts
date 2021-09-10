import { Service, Inject } from 'typedi';
import { DocumentSchema, DriveDocument } from './document.model';
import { S3Manager } from '../core/s3-manager';
import { environment } from '../../environment/base';
import { Types } from 'mongoose';
import * as path from 'path';
import { DocumentsSigningService } from './documents-signing.service';
import { DocumentControlsService } from './document-controls.service';
import { User, logger } from '@aitheon/core-server';
import { FoldersService } from '../folders/folders.service';
import * as _url from 'url';
import * as request from 'request';
import * as Jimp from 'jimp';

const PAYLOAD_SIZE_LIMIT = Infinity;
const THUMBNAIL_SIZE = 1024 * 8;
const THUMBNAIL_JPEG_RESIZE_QUALITY = 50;
enum THUMBNAIL_DIMS {
  HEIGHT = 140,
  WIDTH = 140
}

require('../core/user.model');

@Service()
export class DocumentsService {

  @Inject()
  documentsSigningService: DocumentsSigningService;

  @Inject()
  documentControlsService: DocumentControlsService;

  @Inject()
  foldersService: FoldersService;

  s3Manager: S3Manager;

  constructor() {
    this.s3Manager = new S3Manager();
  }

  /**
   * Find all document based on params
   * @param organizationId organization id (Nullable)
   * @param serviceId service id (Nullable)
   * @param folderId folder id (Nullable)
   * @param userId user id (Nullable)
   * @param keyId key id under service (Nullable)
   */
  async findAll(organizationId: string, serviceId: string, folderId: string, userId: string, keyId: string): Promise<DriveDocument[]>  {
    return new Promise<DriveDocument[]>((resolve, reject) => {
      const params = {} as any;
      if (organizationId) {
        params.organization = Types.ObjectId(organizationId);
      } else {
        // tslint:disable-next-line:no-null-keyword
        params.organization = { $eq: null };
        if (!serviceId && userId) {
          params.createdBy = Types.ObjectId(userId);
        }
      }
      if (serviceId) {
        params['service._id'] = serviceId;
        // tslint:disable-next-line:no-null-keyword
        params['service.key'] = keyId ? keyId : { $eq: null };
      } else {
        // tslint:disable-next-line:no-null-keyword
        params.service = { $eq: null };
      }
      // tslint:disable-next-line:no-null-keyword
      params.folder = folderId ? Types.ObjectId(folderId) : { $eq: null };

      const aggregations: Array<any> = [
        { $match: params },
        { $lookup: { 'from' : 'drive__share', 'localField' : '_id', 'foreignField' : 'document', 'as' : 'shared' }},
        { $addFields: { 'sharedCount': { '$size': '$shared' }} },
        { $addFields: { 'isShared': { '$gt': [ '$sharedCount', 0 ] } }},
        {
          $lookup: {
            'from': 'users',
            'let': { 'createdBy': '$createdBy' },
            'pipeline': [
              { $match: { $expr: { $eq: ['$_id', '$$createdBy'] } } },
              { $project: { _id: 1, profile: 1 } }
            ],
            'as': 'createdBy'
          }
        },
        { $unwind: { path : '$createdBy' }},
        { $project: { 'shared': 0, 'sharedCount': 0 }}
      ];
      DocumentSchema.aggregate(aggregations).sort('-createdAt').exec((err: any, result: DriveDocument[]) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  async findByServices(organizationId: string): Promise<DriveDocument[]>  {
    const params = {
      // tslint:disable-next-line:no-null-keyword
      service: { $ne: null }
    } as any;
    if (organizationId) {
      params.organization = organizationId;
    }
    return DocumentSchema.find(params);
  }

  async findByFolder(folder: string): Promise<DriveDocument[]>   {
    const params = {
      folder: folder
    };
    return DocumentSchema.find(params).populate('createdBy', '_id profile.firstName profile.lastName').sort('-createdAt');
  }

  async findByFolders(folders: string[]): Promise<DriveDocument[]>   {
    const params = {
      folder: {
        $in: folders
      }
    };
    return DocumentSchema.find(params).populate('createdBy', '_id profile.firstName profile.lastName').sort('-createdAt');
  }

  /**
   * Upload file and create a document record
   * @param document Document to create
   * @param file File to upload
   */
  async create(document: DriveDocument, file: any, isExternal: boolean = false): Promise<any> {
    const documentSchema = new DocumentSchema({ name: document.name, createdBy: document.createdBy });
    const subFolder = document.organization ? `/ORGANIZATIONS/${ document.organization }/` : `/`;
    const storeKey = `${ environment.service._id }/DOCUMENTS${ subFolder }${ documentSchema._id.toString() }${ path.extname(file.originalname) }`;
    const fileResult = await this.s3Manager.uploadFile(storeKey, file.mimetype, file.buffer);

    if (file.buffer.length > THUMBNAIL_SIZE && isImage(file.mimetype)) {
      try {
        documentSchema.thumbnail = (await resizeDocument(file.buffer, file.mimetype)).toString('base64');
      } catch (err) {
        logger.error(err);
      }
    }

    documentSchema.name = file.originalname;
    documentSchema.storeKey = storeKey;
    documentSchema.contentType = file.mimetype;
    documentSchema.size = fileResult.size;
    documentSchema.service = document.service;
    documentSchema.folder = document.folder;
    documentSchema.organization = document.organization;
    documentSchema.isExternal = isExternal;

    if (document.serviceFolder) {
      const folder = await this.foldersService.findByDynamicName(document.serviceFolder, document.organization);
      if (folder && folder._id) {
        documentSchema.folder = folder._id;
      }
    }

    return documentSchema.save();
  }

  /**
   * Get file from external url, upload file and create a document record
   * @param document Document to create
   * @param url URL to get file from
   */
  async createFromUrl(document: DriveDocument, url: string): Promise<any> {
    const file: {buffer: Buffer, originalname: string, mimetype: string} = await getExternal(url);
    return await this.create(document, file, true);
  }

  async update(document: DriveDocument): Promise<DriveDocument> {
    document.updatedAt = new Date();
    return DocumentSchema.findByIdAndUpdate(document._id, document);
  }

  async findById(documentId: string): Promise<DriveDocument> {
    return DocumentSchema.findById(documentId).populate('createdBy', '_id profile.firstName profile.lastName');
  }

  async remove(documentId: string): Promise<DriveDocument> {
    const document = await this.findById(documentId);
    await this.s3Manager.removeFile(document.storeKey);
    this.documentControlsService.removeByDocuments([documentId]);
    return DocumentSchema.findByIdAndRemove(documentId);
  }

  async removeByFolders(folderIds: string[]): Promise<string[]> {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        const documents = await DocumentSchema.find({ folder: { $in: folderIds }});
        const documentIds = documents.map((doc: DriveDocument) => { return doc._id.toString(); });
        if (documentIds.length > 0) {
          await this.s3Manager.removeFiles(documents.map((doc: DriveDocument) => { return doc.storeKey.toString(); }));
          this.documentControlsService.removeByDocuments(documentIds);
          await DocumentSchema.remove({ _id: { $in: documentIds }});
        }
        resolve(documentIds);
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateSignedPdf(document: any, currentUser: User): Promise<any> {
    return new Promise<DriveDocument>(async (resolve, reject) => {
      try {
        const controls = await this.documentControlsService.findAll(document._id, true);
        const signedDocumentBuffer = await this.documentsSigningService.sign(document, controls, currentUser);
        const file = {
          buffer: signedDocumentBuffer,
          size: signedDocumentBuffer.byteLength,
          mimetype: 'application/pdf',
          originalname: `Signed_${ document.name }`
        };
        // clone document
        const dObject = document.toJSON() as DriveDocument;
        dObject._id = undefined;
        const newDocument = new DocumentSchema(dObject);
        // newDocument
        const signedDocument = await this.create(newDocument, file);
        return resolve(signedDocument);
      } catch (err) {
        reject(err);
      }
    });
  }

}

async function getExternal(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = request.get({url});
    req.on('response', (res) => {
      const imageMimeType = !!res.headers['content-type']
                          && (
                            res.headers['content-type'].includes('image/')
                            || res.headers['content-type'].includes('application/pdf')
                          );
      const data: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size >= PAYLOAD_SIZE_LIMIT) {
          return res.destroy(new Error('Payload size exceeded'));
        }
        data.push(chunk);
      });
      res.on('end', () => {
        if (imageMimeType !== true) {
          return reject(new Error('Unsupported mime type'));
        }
        const pld = Buffer.concat(data);
        resolve({
          buffer: pld,
          mimetype: res.headers['content-type'],
          originalname: path.basename(res.request.uri.pathname)
        });
      });
    });

    req.on('error', (e: Error) => {
      reject(e);
    });
  });
}

async function resizeDocument(buffer: Buffer, mimetype: string) {
  const tn = await Jimp.read(buffer);
  const resized = tn.scaleToFit(THUMBNAIL_DIMS.WIDTH, THUMBNAIL_DIMS.HEIGHT);
  const applyedQuality = resized.quality(THUMBNAIL_JPEG_RESIZE_QUALITY);
  return await applyedQuality.getBufferAsync(mimetype);
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

