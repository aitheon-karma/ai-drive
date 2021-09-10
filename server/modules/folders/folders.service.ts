import { Container,  Service, Inject } from 'typedi';
import { FolderSchema, Folder } from './folder.model';
import * as async from 'async';
import { Types } from 'mongoose';
import { Transporter, TransporterService, Event, Action } from '@aitheon/transporter';
import { UserSchema } from '../core/user.model';
import * as _ from 'lodash';
import { ACLService } from '../acl/acl.service';
import { ObjectID } from 'mongodb';
import { ProjectsApi } from '@aitheon/project-manager-server';
import { Current, logger } from '@aitheon/core-server';

@Service()
@Transporter()
export class FoldersService extends TransporterService {

  aclService: ACLService;
  projectsApi: ProjectsApi;
  constructor(broker: any, schema?: any, ) {
    super(broker, schema);
    this.aclService = Container.get(ACLService);
    this.projectsApi = new ProjectsApi(`https://${process.env.DOMAIN || 'dev.aitheon.com'}/project-manager`);
  }

  async findByParent(parent: string): Promise<Folder[]> {
    return FolderSchema.find({ parent: parent });
  }

  async findChildren(folderId: string): Promise<Folder[]> {
    return new Promise<Folder[]>(async (resolve, reject) => {
      try {
        const folder = await FolderSchema.findById(folderId) as any;
        const folders = await folder.getChildren({}, undefined, {}, true);
        resolve(folders);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getAncestors(folderId: string): Promise<Folder[]> {
    return new Promise<Folder[]>(async (resolve, reject) => {
      try {
        const folder = await FolderSchema.findById(folderId) as any;
        const folders = await folder.getAncestors({});
        resolve(folders);
      } catch (err) {
        reject(err);
      }
    });
  }

  async findByUser(user: string, parent: string): Promise<Folder[]> {
    const query = { createdBy: user,
     // tslint:disable-next-line:no-null-keyword
     organization: { $eq: null }
    } as any;
    if (parent) {
      query.parent = parent;
    } else {
      // tslint:disable-next-line:no-null-keyword
      query.parent = { $eq: null };
    }
    return FolderSchema.find(query);
  }

  async findServiceFolders(current: Current, serviceId: string, organization?: string): Promise<Folder[]> {
    const query: any = {serviceKey: serviceId};
    if (!organization) {
      query['createdBy'] = current.user._id;
      query['organization'] = {$exists: false};
    } else {
      query['organization'] = ObjectID.createFromHexString(organization);
    }
    const folders = await (await FolderSchema.distinct('dynamicNameRef', query))
              .reduce(async (agg, coll) => {
                const aggregations: Array<any> = [
                  { $match: query },
                  { $lookup: { 'from' : coll, 'localField' : 'dynamicName', 'foreignField' : '_id', 'as' : 'shared' }},
                  { $unwind: '$shared' },
                  { $addFields: { 'dynamicName': '$shared.name' }},
                  { $addFields: { 'dynamicId': '$shared._id' }},
                  { $project: {'shared': 0}}
                ];
                return (await agg).concat(await FolderSchema.aggregate(aggregations));
              }, []);
    const result = await Promise.all(folders.map(async (folder: any) => {
      const hasAccessResp = await this.projectsApi.hasProjectAccess(folder.dynamicId, false, { headers: { 'Authorization': `JWT ${current.token}`, 'organization-id': current.organization._id } });
      const hasAccess = hasAccessResp.body.hasAccess;
      return {
        ...folder,
        hasAccess
      };
    }) as Folder[]);
    return result;
  }

  async find(user: string, organization?: string, parent?: string): Promise<Folder[]> {
    return new Promise<Folder[]>((resolve, reject) => {
      let query = { createdBy: Types.ObjectId(user),
        // tslint:disable-next-line:no-null-keyword
        organization: { $eq: null }
      } as any;
      if (organization) {
        query = { organization: Types.ObjectId(organization), serviceKey: {$exists: false} };
      }
      if (parent) {
        query.parent = Types.ObjectId(parent);
      } else {
        // tslint:disable-next-line:no-null-keyword
        query.parent = { $eq: null };
      }
      const aggregations: Array<any> = [
        { $match: query },
        { $lookup: { 'from' : 'drive__share', 'localField' : '_id', 'foreignField' : 'folder', 'as' : 'shared' }},
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
      FolderSchema.aggregate(aggregations).sort('-name').exec((err: any, result: Folder[]) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  @Event()
  async createServiceFolder(opts: any): Promise<any> {
    try {
      await this.processServiceFolder(opts);
      this.broker.emit(`ProjectsService.updateProjectFolderStatus`, { projectId: opts.projectId, status: 'CREATED' }, `PROJECT_MANAGER`);
    } catch (err) {
      this.logger.error(err);
      this.broker.emit(`ProjectsService.updateProjectFolderStatus`, { projectId: opts.projectId, status: 'ERROR' }, `PROJECT_MANAGER`);
      return Promise.reject(err.message);
    }
  }

  @Action()
  async getServiceFolder(opts: any): Promise<Folder> {
    try {
      return await this.processServiceFolder(opts.params);
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err.message);
    }
  }

  async processServiceFolder(opts: any): Promise<Folder> {
    this.logger.info('[opts]: ', opts);
    const {
      userId,
      organizationId,
      projectId,
      projectSchemaName,
      serviceKey
    } = opts;
    if (!userId || !organizationId || !projectId || !projectSchemaName || !serviceKey) {
      const err = new Error('Insufficient arguments');
      this.logger.error(err);
      return Promise.reject(err.message);
    }

    const user: any = await UserSchema.findOne({_id: ObjectID.createFromHexString(userId)});
    const folder: any = {
      dynamicName: projectId,
      dynamicNameRef: projectSchemaName,
      organization: organizationId,
      serviceKey
    };

    const folderExists = await FolderSchema.findOne(folder);

    folder.createdBy = userId;

    const normalAccess = await this.aclService.checkSystemFolderAccess(folder as any, user.roles, organizationId, 'WRITE');
    if (!normalAccess.access) {
      const err = new Error('ACL error: ' + JSON.stringify(normalAccess));
      this.logger.error(err);
      return Promise.reject(err.message);
    }

    if (folderExists) {
      return Promise.resolve(folderExists);
    }

    const folderSchema = new FolderSchema(folder);
    return await folderSchema.save();
  }

  async create(folder: Folder): Promise<Folder> {
    const folderSchema = new FolderSchema(folder);
    return folderSchema.save();
  }

  async update(folder: Folder): Promise<Folder> {
    return FolderSchema.findByIdAndUpdate(folder._id, folder);
  }

  async findById(folderId: string): Promise<Folder> {
    return FolderSchema.findById(folderId);
  }

  async remove(folderId: string): Promise<Folder> {
    return FolderSchema.findByIdAndRemove(folderId);
  }

  async findByDynamicName(dynamicName: string, organization: string): Promise<Folder> {
    return FolderSchema.findOne({ dynamicName, organization });
  }

}
