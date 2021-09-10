import { Service, Inject } from 'typedi';
import { ACLSchema, ACL } from './acl.model';
import { Organization, User, Role, ServiceMini } from '@aitheon/core-server';
import { TransporterService } from '@aitheon/transporter';
import * as async from 'async';
import { Types } from 'mongoose';
import { DriveDocument } from '../documents/document.model';
import { Folder } from '../folders/folder.model';

const ROOT_ORG_ROLES = ['Owner', 'SuperAdmin', 'OrgAdmin'];

@Service()
export class ACLService extends TransporterService  {

  levels = [
    'READ',
    'WRITE',
    'FULL'
  ];

  constructor(broker: any, schema?: any, ) {
    super(broker, schema);
  }

  async findOne(service: string, keyId?: string, organization?: string): Promise<ACL> {
    const query = { service: { _id: service } } as any;
    if (keyId) {
      query.service.keyId = keyId;
    }
    if (organization) {
      query.organization = organization;
    }
    return ACLSchema.findOne(query);
  }

  async findByUser(user: string): Promise<ACL[]> {
    const query = { user: user } as any;
    return ACLSchema.find(query);
  }

  async findOneByUser(user: string, serviceId: string, keyId?: string, organization?: string, isPublic: boolean = false): Promise<ACL> {
    let query = { user: user, 'service._id': serviceId } as any;
    if (keyId) {
      query['service.key'] = keyId;
    }
    if (organization) {
      query.organization = organization;
    }
    if (isPublic) {
      query = {
        'service._id': serviceId,
        'service.key':  keyId
      };
    }
    return ACLSchema.findOne(query);
  }

  async findOneByService(serviceId: string, keyId: string): Promise<ACL> {
    const query = {
      'service._id': serviceId,
      'service.key':  keyId
    };
    return ACLSchema.findOne(query);
  }

  async create(acl: ACL): Promise<ACL> {
    const query = { user: acl.user, organization: acl.organization } as any;
    if (acl.service) {
      query.service = acl.service;
    }
    return ACLSchema.findOneAndUpdate(query, acl, { upsert: true, new: true });
  }

  async update(acl: ACL): Promise<ACL> {
    return ACLSchema.findByIdAndUpdate(acl._id, acl);
  }

  async remove(aclId: string): Promise<ACL> {
    return ACLSchema.findByIdAndRemove(aclId);
  }

  async findServiceKeys(user: string, serviceId: string, organization?: string): Promise<Array<{ key: string, keyName: string, public: boolean }>> {
    return new Promise<Array<{ key: string, keyName: string, public: boolean }>>(async (resolve, reject) => {

      const $matchAgr = {
        $match: {
         'service._id': serviceId,
         // tslint:disable-next-line:no-null-keyword
         $or: [{ user: Types.ObjectId(user)}, { user: { $eq: null as any } }]
        } as any
      };
      if (organization) {
        $matchAgr.$match.organization = Types.ObjectId(organization);
      }
      const aggregations = [
        $matchAgr,
        {
          $group: {
            '_id': '$service.key',
            'name': { '$first': '$service.keyName' },
            'public': { '$first': '$public' },
          }
        }
      ];
      ACLSchema.aggregate(aggregations).exec((err, result: any) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  checkAccessLevel(requiredLevel: string, userLevel: string): boolean {
    const requiredLevelIndex = this.levels.indexOf(requiredLevel);
    const userLevelIndex = this.levels.indexOf(userLevel);
    const access = userLevelIndex >= requiredLevelIndex;
    return access;
  }

  async checkServiceFolderAccess(
    folder: Folder,
    user: User,
    organization: string,
    level: string,
    isPublic: boolean = false
  ): Promise<{access: boolean, isPublic: boolean, level: string}> {
    if (!folder) {
      return { access: false, isPublic: false, level: undefined };
    }
    /**
     * System folders access
     */
    if (!isPublic && organization) {
      const orgRole = user.roles.find((role: Role) => role.organization._id === organization);
      if (!orgRole) {
        return { access: false, isPublic: false, level: undefined };
      }
      if (ROOT_ORG_ROLES.indexOf(orgRole.role) > -1) {
        return { access: true, isPublic: false, level: orgRole.role };
      }
      const serviceRole = orgRole.services.find((service: ServiceMini) => service.service === folder.serviceKey);
      if (serviceRole && serviceRole.role === 'ServiceAdmin') {
        return { access: true, isPublic: false, level: serviceRole.role };
      }
    }

    const acl = await this.findOneByUser(user._id, folder.serviceKey, undefined, organization, isPublic);
    if (!acl) {
      return { access: false, isPublic: false, level: undefined };
    }

    if (this.checkAccessLevel(level, acl.level)) {
      return { access: true, isPublic: false, level: acl.level };
    }

    /**
     * Public access system folders like General channel in messages
     */
    if (acl.public) {
      /**
       * for sysadmin we allow evrything in public
       */
      if (user.sysadmin) {
        return { access: true, isPublic: true, level: 'FULL' };
      } else {
        /**
         * for normal users only read access on public documents
         */
        if (level === 'READ' || level === 'WRITE') {
          return { access: true, isPublic: true, level };
        }
      }
    }
  }

  async checkAccess(document: DriveDocument, user: User, organization: string, level: string, isPublic: boolean = false): Promise<{ access: boolean, isPublic: boolean }> {
    return new Promise<{ access: boolean, isPublic: boolean }>(async (resolve, reject) => {

      if (!document.service || (document.service && !document.service._id)) {
        /**
         * Personal document. No service spesificed so user is only full owner
         */
        if (!document.organization) {
          const createdBy =  document.createdBy._id ? document.createdBy._id.toString() : document.createdBy.toString();
          const isOwner = createdBy === user._id;
          return resolve({ access: isOwner, isPublic: false });
        } else {
           /**
            * Organization document
            */
          const isOrganization = document.organization.toString() === organization;
          return resolve({ access: isOrganization, isPublic: false });
        }
      }

      /**
       * System folders access
       */
      if (!isPublic && organization) {
        // 'Owner', 'SuperAdmin', 'OrgAdmin', 'ServiceAdmin'
        const rootOrgRoles = ['Owner', 'SuperAdmin', 'OrgAdmin'];
        const orgRole = user.roles.find((role: Role) => role.organization._id === organization);
        if (!orgRole) {
          return resolve({ access: false, isPublic: false });
        }
        if (rootOrgRoles.indexOf(orgRole.role) > -1) {
          return resolve({ access: true, isPublic: false });
        }
        const serviceRole = orgRole.services.find((service: ServiceMini) => service.service === document.service._id);
        if (serviceRole && serviceRole.role === 'ServiceAdmin') {
          return resolve({ access: true, isPublic: false });
        }
      }
      const acl = await this.findOneByUser(user._id, document.service._id, document.service.key, organization, isPublic);
      if (!acl) {
        return resolve({ access: false, isPublic: false });
      }

      if (this.checkAccessLevel(level, acl.level)) {
        return resolve({ access: true, isPublic: false });
      }

      /**
       * Public access system folders like General channel in messages
       */
      if (acl.public) {
        /**
         * for sysadmin we allow evrything in public
         */
        if (user.sysadmin) {
          return resolve({ access: true, isPublic: true });
        } else {
          /**
           * for normal users only read access on public documents
           */
          if (level === 'READ' || level === 'WRITE') {
            return resolve({ access: true, isPublic: true });
          }
        }
      }

      resolve({ access: false, isPublic: false });
    });
  }

   async checkSystemFolderAccess(document: Folder, roles: Role[], organization: string, level: string, isPublic: boolean = false) {
    return new Promise<{ access: boolean, isPublic: boolean }>(async (resolve, reject) => {
      if (!isPublic && organization) {
        const orgRole = roles.find((role: any) => {
          return role.organization.toString() === organization;
        });
        if (!orgRole) {
          return resolve({ access: false, isPublic: false });
        }
        if (ROOT_ORG_ROLES.indexOf(orgRole.role) > -1) {
          return resolve({ access: true, isPublic: false });
        }
        const serviceRole = orgRole.services.find((service: ServiceMini) => service.service === document.serviceKey);
        if (serviceRole && serviceRole.role === 'ServiceAdmin') {
          return resolve({ access: true, isPublic: false });
        }
      }
      resolve({ access: false, isPublic: false });
    });
  }

}
