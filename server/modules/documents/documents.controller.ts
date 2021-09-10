import { UseBefore, Controller, Get, Post, Delete, Body, BodyParam, UploadedFile, Param, Res, Req, JsonController, QueryParam, Authorized, CurrentUser, Put, Redirect } from 'routing-controllers';
import { Inject } from 'typedi';
import { InsertOneWriteOpResult } from 'mongodb';
import { DocumentsService } from './documents.service';
import { DriveDocument, DocumentSchema, ServiceModel } from './document.model';
import { Request, Response } from 'express';
import { S3Manager } from '../core/s3-manager';
import Db from '@aitheon/core-server/dist/config/db';
import { Current, User, logger } from '@aitheon/core-server';
import * as _ from 'lodash';
import { ACLService } from '../acl/acl.service';
import { ShareService } from '../share/share.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { getUserFromRequest } from '@aitheon/core-server';
import { DocumentControlsService } from './document-controls.service';
import { DocumentControl } from './document-control.model';
import { FoldersService } from '../folders/folders.service';
import { OpenAPI } from 'routing-controllers-openapi';
import { ValidateServiceId } from '../core/validate-service.middleware';
import { OrganizationSchema } from '../core/organization.model';
const SERVICES_COLLECTION_NAME = 'services';

@JsonController('/api/documents')
export class DocumentsController {

  s3Manager: S3Manager;

  constructor() {
    this.s3Manager = new S3Manager();
  }

  @Inject()
  documentsService: DocumentsService;

  @Inject()
  documentControlsService: DocumentControlsService;

  @Inject()
  aclService: ACLService;

  @Inject()
  shareService: ShareService;

  @Inject()
  userSettings: UserSettingsService;

  @Inject()
  foldersService: FoldersService;

  @Authorized()
  @Get('/')
  @OpenAPI({ description: 'List documents', operationId: 'list' })
  async list(
    @CurrentUser() current: Current,
    @Res() response: Response,
    @QueryParam('service') service: string,
    @QueryParam('folder') folder: string,
    @QueryParam('keyId') keyId: string,
    @QueryParam('signedUrlExpire') signedUrlExpire: number
  ) {

    const organizationId = current.organization && current.organization._id || '';
    const documents = await this.documentsService.findAll(organizationId, service, folder, current.user._id, keyId);
    if (signedUrlExpire && signedUrlExpire > 0) {
      for (let i = 0, l = documents.length; i < l; i++) {
        try {
          documents[i].signedUrl = await this.s3Manager.getSignedUrl(documents[i].storeKey, `${ documents[i].name }`, signedUrlExpire, false);
        } catch (err) {
          logger.error(err.stack || err);
        }
      }
    }
    return response.json(documents);
  }

  @Post('/internal')
  @UseBefore(ValidateServiceId)
  @OpenAPI({ description: 'Create document by service', operationId: 'createByService' })
  async createByService(
    @UploadedFile('file') file: any,
    @Body() document: any,
    @QueryParam('isPublic') isPublic: boolean,
    @QueryParam('signedUrlExpire') signedUrlExpire: number,
    @QueryParam('organization') organization: string,
    @Req() request: Request,
    @Res() response: Response) {

      document.service = {_id: request.headers['x-service-target']};

      const org = await OrganizationSchema.findOne({_id: organization}).lean();

      const serviceCoreList = [];
      const cursor = await Db.connection.collection(SERVICES_COLLECTION_NAME).find({envStatus: 'PROD'});
      while (await cursor.hasNext()) {
        const serviceDoc = await cursor.next();
        serviceCoreList.push(serviceDoc);
      }
      const serviceCoreListIds = serviceCoreList.map(s => s._id.toString());

      if (
        !org
        || !org.services
        || !Array.isArray(org.services)
        || ![...org.services, ...serviceCoreListIds].includes(document.service._id)
      ) {
        throw new Error('Not authorized to upload to service');
      }

      // tslint:disable-next-line:no-null-keyword
      document.service.key = null;
      // tslint:disable-next-line:no-null-keyword
      document.createdBy = null;

      const organizationId = organization;

      if (!isPublic && organizationId) {
        document.organization = organizationId;
        if (document.service && (!document.service._id && !document.service.key)) {
          return response.status(422).send({ message: 'For organization documents you need specify a service and a key' });
        }
      }

      const result = (await this.documentsService.create(document, file)).toObject() as DriveDocument;
      if (signedUrlExpire && signedUrlExpire > 0) {
        const url = await this.s3Manager.getSignedUrl(result.storeKey, `${ document.name }`, signedUrlExpire);
        result.signedUrl = url;
      }

      return response.json(result);
  }

  @Authorized()
  @Post('/')
  @OpenAPI({ description: 'Create document', operationId: 'create' })
  async create(@UploadedFile('file') file: any, @CurrentUser() current: Current, @Body() document: DriveDocument,
               @QueryParam('isPublic') isPublic: boolean, @QueryParam('signedUrlExpire') signedUrlExpire: number, @QueryParam('organization') organization: string, @Res() response: Response) {

    if (document.service) {
      document.service = JSON.parse(document.service as any);
    }

    const organizationId = organization || (current.organization ? current.organization._id : '');

    if (!isPublic && organizationId) {
      document.organization = organizationId;
      if (document.service && (!document.service._id && !document.service.key)) {
        return response.status(422).send({ message: 'For organization documents you need specify a service and a key' });
      }
    }
    document.createdBy = current.user._id;
    const normalAccess = await this.aclService.checkAccess(document, current.user, organizationId, 'WRITE', isPublic);
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }

    const settings = await this.userSettings.findByUser(current.user._id, organizationId);
    // if (!normalAccess.isPublic) {
    //   if ((settings.space.total - settings.space.used) < file.size) {
    //     return response.status(422).send({ message: 'No space left.' });
    //   }
    // }

    const result = (await this.documentsService.create(document, file)).toObject() as DriveDocument;

    if (!normalAccess.isPublic) {
      settings.space.used += file.size;
      await this.userSettings.save(settings);
    }

    if (document.folder) {
      this.shareService.checkAndCreateShare(document.folder, result._id.toString(), undefined);
    }

    result.createdBy = _.pick(current.user, '_id', 'profile.firstName', 'profile.lastName');

    if (signedUrlExpire && signedUrlExpire > 0) {
      const url = await this.s3Manager.getSignedUrl(result.storeKey, `${ document.name }`, signedUrlExpire);
      result.signedUrl = url;
    }

    return response.json(result);
  }

  @Authorized()
  @Post('/external')
  @OpenAPI({ description: 'Create document from external url', operationId: 'createFromExternal' })
  async createFromExternal(
    @CurrentUser() current: Current,
    @Res() response: Response,
    @BodyParam('url') url: string,
    @BodyParam('service') service: ServiceModel,
    @BodyParam('isPublic') isPublic?: boolean,
    @BodyParam('signedUrlExpire') signedUrlExpire?: number,
    @BodyParam('organization') organization?: string,
    @BodyParam('serviceFolder') serviceFolder?: string
  ) {

    const document: any = {service, serviceFolder};
    if (!url) {
      return response.sendStatus(400);
    }

    const organizationId = organization || (current.organization ? current.organization._id : '');

    if (!isPublic && organizationId) {
      document.organization = organizationId;
      if (document.service && (!document.service._id && !document.service.key)) {
        return response.status(422).send({ message: 'For organization documents you need specify a service and a key' });
      }
    }
    document.createdBy = current.user._id;
    const normalAccess = await this.aclService.checkAccess(document, current.user, organizationId, 'WRITE', isPublic);
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }

    const settings = await this.userSettings.findByUser(current.user._id, organizationId);

    const result = (await this.documentsService.createFromUrl(document, url)).toObject() as DriveDocument;

    if (!normalAccess.isPublic) {
      settings.space.used += result.size;
      await this.userSettings.save(settings);
    }

    if (document.folder) {
      this.shareService.checkAndCreateShare(document.folder, result._id.toString(), undefined);
    }

    result.createdBy = _.pick(current.user, '_id', 'profile.firstName', 'profile.lastName');

    if (signedUrlExpire && signedUrlExpire > 0) {
      const url = await this.s3Manager.getSignedUrl(result.storeKey, `${ document.name }`, signedUrlExpire);
      result.signedUrl = url;
    }

    return response.json(result);
  }

  @Authorized()
  @Get('/serviceFolder/:dynamicName')
  @OpenAPI({ description: 'List documents by dynamic name', operationId: 'listServiceFolderDocuments' })
  async listServiceFolderDocuments(
    @CurrentUser() current: Current,
    @Res() response: Response,
    @Param('dynamicName') dynamicName: string
  ) {
    const folder = await this.foldersService.findByDynamicName(dynamicName, current.organization && current.organization._id);
    const { access } = await this.aclService.checkServiceFolderAccess(folder, current.user, current.organization && current.organization._id, 'READ' );
    if (access !== true) {
      return response.sendStatus(401);
    }
    const docs: any = await this.documentsService.findByFolders([folder._id]);
    for (let i = 0, l = docs.length; i < l; i++) {
      try {
        docs[i] = docs[i].toObject();
        docs[i].signedUrl = await this.s3Manager.getSignedUrl(docs[i].storeKey, `${ docs[i].name }`, 60, false);
      } catch (err) {
        logger.error(err.stack || err);
      }
    }

    return response.json(docs);
  }

  @Authorized()
  @Get('/:id')
  @OpenAPI({ description: 'Get document by id', operationId: 'getById' })
  @Redirect('http://aitheon.com')
  async getById(@Param('id') id: string, @QueryParam('download') download: boolean, @Req() request: Request, @Res() response: Response) {
    const document = await this.documentsService.findById(id);
    if (!document) {
      return response.sendStatus(404);
    }

    let isPublic = false;
    if (document.service && document.service._id && document.service.key) {
      const documentAcl = await this.aclService.findOneByService(document.service._id, document.service.key);
      if (documentAcl && documentAcl.public) {
        isPublic = true;
      }
    }

    let current: any;
    try {
      current = await getUserFromRequest(request, []);
    } catch (error) {}

    const organization = current && current.organization ? current.organization._id : undefined;
    const user = current && current.user ? current.user : undefined;
    const sharedAccess = await this.shareService.checkAccess(document._id, user, organization, 'READ');

    if (!user) {
      // shareable link only. when no user and shared no access
      if (!sharedAccess) {
        return response.sendStatus(401);
      }
    } else {
      const normalAccess = await this.aclService.checkAccess(document, user, organization, 'READ', isPublic);
      // check one of access
      if (!sharedAccess && !normalAccess.access) {
        return response.sendStatus(401);
      }
    }
    const url = await this.s3Manager.getSignedUrl(document.storeKey, `${ document.name }`, 60, download);
    return url;
  }

  @Authorized()
  @Put('/:id')
  @OpenAPI({ description: 'Update document by id', operationId: 'update' })
  async update(@Param('id') id: string, @Body() document: DriveDocument, @CurrentUser() current: Current, @Res() response: Response) {
    const existDoc = await this.documentsService.findById(id);
    const organizationId = current.organization ? current.organization._id : undefined;
    const normalAccess = await this.aclService.checkAccess(existDoc, current.user, organizationId, 'FULL');
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }
    const result = await this.documentsService.update(_.pick(document, '_id', 'name', 'share') as DriveDocument);
    return response.sendStatus(204);
  }

  @Authorized()
  @Post('/:id/sign')
  @OpenAPI({ description: 'Sign document by id', operationId: 'sign' })
  async sign(@Param('id') id: string, @CurrentUser() current: Current, @Res() response: Response) {

    const document = await this.documentsService.findById(id);
    if (!document) {
      return response.sendStatus(404);
    }

    const organizationId = current.organization ? current.organization._id : undefined;
    const normalAccess = await this.aclService.checkAccess(document, current.user, organizationId, 'FULL');
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }

    const settings = await this.userSettings.findByUser(current.user._id, organizationId);
    // if (!normalAccess.isPublic) {
    //   if ((settings.space.total - settings.space.used) < document.size) {
    //     return response.status(422).send({ message: 'No space left.' });
    //   }
    // }

    const result = (await this.documentsService.generateSignedPdf(document, current.user)).toObject() as DriveDocument;

    if (!normalAccess.isPublic) {
      settings.space.used += result.size;
      await this.userSettings.save(settings);
    }

    if (document.folder) {
      this.shareService.checkAndCreateShare(document.folder, result._id.toString(), undefined);
    }

    result.createdBy = _.pick(current.user, '_id', 'profile.firstName', 'profile.lastName');
    return response.json(result);
  }

  @Authorized()
  @Delete('/:id')
  @OpenAPI({ description: 'Delete document by id', operationId: 'remove' })
  async remove(@CurrentUser() current: Current, @Param('id') id: string, @Res() response: Response) {
    const document = await this.documentsService.findById(id);
    const organizationId = current.organization ? current.organization._id : undefined;
    const normalAccess = await this.aclService.checkAccess(document, current.user, organizationId, 'FULL');
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }
    await this.s3Manager.removeFile(document.storeKey);
    const result = await this.documentsService.remove(id);
    await this.shareService.removeAll([], [id]);
    return response.sendStatus(204);
  }

  @Authorized()
  @Get('/:documentId/controls')
  @OpenAPI({ description: 'Get document controls', operationId: 'controlsList' })
  async controlsList(@Param('documentId') documentId: string, @Res() response: Response) {
    const controls = await this.documentControlsService.findAll(documentId);
    return response.json(controls);
  }

  @Authorized()
  @Post('/:documentId/controls')
  @OpenAPI({ description: 'Create document controls', operationId: 'saveControl' })
  async saveControl(@Body() documentControl: DocumentControl, @Res() response: Response) {
    const result = await this.documentControlsService.save(documentControl);
    return response.json(result);
  }

  @Authorized()
  @Delete('/:documentId/controls/:controlId')
  @OpenAPI({ description: 'Delete document controls', operationId: 'removeControl' })
  async removeControl(@Param('controlId') id: string, @Res() response: Response) {
    const result = await this.documentControlsService.remove(id);
    return response.sendStatus(204);
  }

}
