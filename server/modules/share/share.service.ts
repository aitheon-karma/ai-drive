import { Service, Inject } from 'typedi';
import { ShareSchema, Share } from './share.model';
import { Organization, User, Role } from '@aitheon/core-server';
import { UserSchema } from '../core/user.model';
import { OrganizationSchema } from '../core/organization.model';
import * as async from 'async';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { Types } from 'mongoose';
import { DriveDocument } from '../documents/document.model';
import { Folder } from '../folders/folder.model';
import { FoldersService } from '../folders/folders.service';
import { DocumentsService } from '../documents/documents.service';
import { MailManager } from '../core/mail.manager';
import * as handlebars from 'handlebars';
import { environment } from '../../environment';
import { logger } from '@aitheon/core-server';

require('../core/team.model');

@Service()
export class ShareService {

  @Inject()
  foldersService: FoldersService;

  @Inject()
  documentsService: DocumentsService;

  mailManager: MailManager;

  constructor() {
    this.mailManager = new MailManager();
    console.log(OrganizationSchema.collection.name);
  }

  /**
   * Find share item by document of folder
   * @param shareId Document or Folder ids
   * @param user Shared to user or Null for shareable link
   */
  async findByItemAndUser(shareId: string, user?: User, organization?: string): Promise<Share> {
    // return ShareSchema.findById({ $and: [{ 'sharedTo.user': user.toString() }, { $or: [{ folder: shareId }, { document: shareId }] }] });
    const query = { $or: [{ folder: shareId }, { document: shareId }] } as any;
    if (user) {
      if (organization) {
        const orgRole = user.roles.find((role: Role) => { return role.organization._id === organization; });
        let teams = [] as Array<Types.ObjectId>;
        if (orgRole) {
          teams = (orgRole as any).teams.map((t: any) => {return Types.ObjectId(t); });
        }
        query['$or'] = [{ 'sharedTo.team': { $in: teams } }, { 'sharedTo.user': Types.ObjectId(user._id) }];
      } else {
        query['sharedTo.user'] = user;
      }
    } else {
      query['sharedTo.shareableLink'] = true;
    }

    // tslint:disable-next-line:no-null-keyword
    query['sharedTo.organization'] = organization ? organization : { $eq: null };

    return ShareSchema.findOne(query).populate('document folder');
  }

  /**
   * Find by document or folder
   * @param document Document Id
   * @param folder Folder Id
   */
  async findByItem(document?: string, folder?: string): Promise<Share[]> {
    const query = {} as any;
    if (document) {
      query.document = document;
    }
    if (folder) {
      query.folder = folder;
    }
    return ShareSchema.find(query)
      .populate('sharedTo.user', '_id email profile')
      .populate('sharedTo.organization', '_id name')
      .populate('sharedTo.team', '_id name');
  }

  /**
   * Find share item by id
   * @param id Share Id
   */
  async findById(id: string): Promise<Share> {
    return ShareSchema.findById(id);
  }

  /**
   * Save sare items for document or folder
   * @param shares Shares list that need to apply for item
   * @param document Document id
   * @param folder Folder Id
   */
  async save(shares: Share[], document: string, folder: string): Promise<{ isShared: boolean }> {
    return new Promise<{ isShared: boolean }>(async (resolve, reject) => {
      const existShares = await this.findByItem(document, folder);
      // exist shares

      const shareChecker = (existShare: Share, newShare: Share): boolean => {
        if (existShare.sharedTo.user) {
          return newShare.sharedTo.user && existShare.sharedTo.user.toString() === newShare.sharedTo.user.toString();
        } else if (existShare.sharedTo.team) {
          return newShare.sharedTo.team && existShare.sharedTo.team.toString() === newShare.sharedTo.team.toString();
        } else if (existShare.sharedTo.shareableLink) {
          return existShare.sharedTo.shareableLink === newShare.sharedTo.shareableLink;
        } else if (existShare.sharedTo.email) {
          return existShare.sharedTo.email === newShare.sharedTo.email;
        }
        return false;
      };

      const sharesToRemove = existShares.filter((existShare: Share) => {
        const index = shares.findIndex((newShare: Share) => {
          return shareChecker(existShare, newShare);
        });
        return index === -1;
      });
      const idsToRemove = sharesToRemove.map((s: Share) => s._id);
      // new shares
      const sharesToAdd = shares.filter((newShare: Share) => {
        const index = existShares.findIndex((existShare: Share) => {
          return shareChecker(existShare, newShare);
        });
        return index === -1;
      });

      try {
        if (idsToRemove.length > 0) {
          await ShareSchema.remove({ _id: { $in: idsToRemove }});
        }
        if (sharesToAdd.length > 0) {
          await ShareSchema.insertMany(sharesToAdd);
        }
        /**
         * For folder all sub folders and documents will apply with a new settings of parent
         */
        if (folder) {
          await this.reccursiveUpdateFolder(folder, sharesToRemove, sharesToAdd);
        }
        const isShared = (existShares.length + (idsToRemove.length * -1) + sharesToAdd.length) > 0;
        /**
         * notify all user/emails
         */
        if (sharesToAdd.length > 0) {
          this.sendNewShareEmail(sharesToAdd, document, folder);
        }
        resolve({ isShared });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Reccursive update sub-folders and all sub-documents with new share settings
   * @param folder folder id
   * @param folderSharesToRemove Shares from folder that need to remove
   * @param folderSharesToAdd Shares from folder that need to add
   */
  async reccursiveUpdateFolder(folder: string, folderSharesToRemove: Share[], folderSharesToAdd: Share[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      // folder
      const childrensFolders = await this.foldersService.findChildren(folder);
      // const sharesToRemove: Share[] = [];
      const queryToRemove = [] as Array<any>;
      const sharesToAdd: Share[] = [];
      childrensFolders.forEach((f: Folder) => {
        folderSharesToRemove.forEach((s: Share) => {
          // sharesToRemove.push(s);
          const query = { folder: f._id.toString(), sharedBy: s.sharedBy._id ? s.sharedBy._id : s.sharedBy } as any;
          if (s.sharedTo.user) {
            query['sharedTo.user'] = s.sharedTo.user;
          } else if (s.sharedTo.team) {
            query['sharedTo.team'] = s.sharedTo.team;
          } else if (s.sharedTo.shareableLink) {
            query['sharedTo.shareableLink'] = s.sharedTo.shareableLink;
          } else if (s.sharedTo.email) {
            query['sharedTo.email'] = s.sharedTo.email;
          }
          // tslint:disable-next-line:no-null-keyword
          query['sharedTo.organization'] = s.sharedTo.organization ? s.sharedTo.organization : { $eq: null };
          queryToRemove.push(query);
        });
        folderSharesToAdd.forEach((s: Share) => {
          const toAdd = Object.assign({ }, s, { folder: f._id.toString() });
          sharesToAdd.push(toAdd);
        });
      });

      const folderIds = childrensFolders.map((f: any) => {
        return f._id.toString();
      });
      folderIds.push(folder);
      const allDocuments = await this.documentsService.findByFolders(folderIds);
      allDocuments.forEach((document: DriveDocument) => {
        folderSharesToRemove.forEach((share: Share) => {
          // sharesToRemove.push(s);
          const query = { document: document,  sharedBy: share.sharedBy._id ? Types.ObjectId(share.sharedBy._id) : share.sharedBy } as any;
          if (share.sharedTo.user) {
            query['sharedTo.user'] = Types.ObjectId(share.sharedTo.user.id ? share.sharedTo.user.id : share.sharedTo.user);
          } else if (share.sharedTo.team) {
            query['sharedTo.team'] = Types.ObjectId(share.sharedTo.team.id ? share.sharedTo.team.id : share.sharedTo.team);
          } else if (share.sharedTo.shareableLink) {
            query['sharedTo.shareableLink'] = share.sharedTo.shareableLink;
          } else if (share.sharedTo.email) {
            query['sharedTo.email'] = share.sharedTo.email;
          }
          // tslint:disable-next-line:no-null-keyword
          query['sharedTo.organization'] = share.sharedTo.organization ? share.sharedTo.organization : { $eq: null };
          queryToRemove.push(query);
        });
        folderSharesToAdd.forEach((s: Share) => {
          const toAdd = Object.assign({ }, s, { folder: undefined, document: document });
          sharesToAdd.push(toAdd);
        });
      });

      try {
        if (queryToRemove.length > 0) {
          queryToRemove.forEach(async (query) => {
            await ShareSchema.findOneAndRemove(query);
          });
        }
        if (sharesToAdd.length > 0) {
          // await ShareSchema.insertMany(sharesToAdd);
          sharesToAdd.forEach(async (share: Share) => {
            const query = { sharedBy: share.sharedBy._id ? Types.ObjectId(share.sharedBy._id) : share.sharedBy._id } as any;
            if (share.document) {
              query.document = share.document;
            } else if (share.folder) {
              query.folder = share.folder;
            }
            if (share.sharedTo.user) {
              query['sharedTo.user'] = Types.ObjectId(share.sharedTo.user.id ? share.sharedTo.user.id : share.sharedTo.user);
            } else if (share.sharedTo.team) {
              query['sharedTo.team'] = Types.ObjectId(share.sharedTo.team.id ? share.sharedTo.team.id : share.sharedTo.team);
            } else if (share.sharedTo.shareableLink) {
              query['sharedTo.shareableLink'] = share.sharedTo.shareableLink;
            } else if (share.sharedTo.email) {
              query['sharedTo.email'] = share.sharedTo.email;
            }
            // tslint:disable-next-line:no-null-keyword
            query['sharedTo.organization'] = share.sharedTo.organization ? share.sharedTo.organization : { $eq: null };
            const result = await ShareSchema.update(query, share, { upsert: true });
            // console.log('ShareToAdd: ', query, share, result);
          });
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Create share records for new folder/document if parent folder is shared
   * @param parentFolder Parent folder
   * @param document New item as Document
   * @param folder New item as Folder
   */
  async checkAndCreateShare(parentFolder: string, document: string, folder: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const shares = await this.findByItem(undefined, parentFolder);
      if (shares.length === 0) {
        return resolve();
      }
      const newShares = shares.map((share: Share) => {
        return {
          document: document,
          folder: folder,
          sharedBy: share.sharedBy,
          sharedTo: {
            shareableLink: share.sharedTo.shareableLink,
            team: share.sharedTo.team,
            user: share.sharedTo.user,
            email: share.sharedTo.email,
            level: share.sharedTo.level,
            organization: share.sharedTo.organization
          }
        };
      });
      await ShareSchema.insertMany(newShares);
      resolve();
    });
  }

  /**
   * Find shared documents by user and folder
   * @param userId shared to user id
   * @param folderId documents folder id
   */
  async findDocuments(user: User, folderId?: string, organizationId?: string): Promise<DriveDocument[]> {
    return new Promise<DriveDocument[]>(async (resolve, reject) => {
      let match;
      if (user && user._id) {
        if (!organizationId) {
          match = {
            $match: {
              // tslint:disable-next-line:no-null-keyword
              'sharedTo.user': Types.ObjectId(user._id), 'document': { $ne: null as any },
            }
          };
        } else {
          // $or: [{ 'sharedTo.team': { $in: [ObjectId('5b0924a2d0961f00155414e1')] } }, { 'sharedTo.user': ObjectId('5925ab587bb5b800150a3e16') }],
          const orgRole = user.roles.find((role: Role) => { return role.organization._id === organizationId; });
          let teams = [] as Array<Types.ObjectId>;
          if (orgRole) {
            teams = (orgRole as any).teams.map((t: any) => {return Types.ObjectId(t); });
          }
          match = {
            $match: {
              // tslint:disable-next-line:no-null-keyword
              '$or': [{ 'sharedTo.team': { $in: teams } }, { 'sharedTo.user': Types.ObjectId(user._id) }],
              // tslint:disable-next-line:no-null-keyword
              'document': { $ne: null as any },
              'sharedTo.organization': Types.ObjectId(organizationId)
            }
          };
        }
      } else {
        // tslint:disable-next-line:no-null-keyword
        match = { $match: { 'sharedTo.shareableLink': true, 'document': { $ne: null as any }  } };
      }

      const aggregations = [
        match,
        { $lookup: { 'from' : 'drive__documents', 'localField' : 'document', 'foreignField' : '_id', 'as' : 'document' } },
        { $unwind: { path : '$document' }},
        // tslint:disable-next-line:no-null-keyword
        { $match: folderId ? { 'document.folder': Types.ObjectId(folderId) } : { 'document.folder': { $eq: null as any } }},
        { $lookup: { 'from' : 'users', 'localField' : 'document.createdBy', 'foreignField' : '_id', 'as' : 'document_createdBy'}},
        { $unwind: { path : '$document_createdBy' }},
        { $project: { 'document': 1, 'document_createdBy': { '_id': 1, 'profile': 1 }}}
      ];
      ShareSchema.aggregate(aggregations).exec((err: any, result: any) => {
        if (err) {
          return reject(err);
        }
        result = _.unionBy(result.map((r: any) => {
          r.document.createdBy = r.document_createdBy;
          return r.document;
        }), 'document._id');

        resolve(result);
      });
    });
  }

  /**
   * Find shared folders by user and parent folder
   * @param userId shared to user id
   * @param folderId folder id
   */
  async findFolders(user: User, folderId?: string, organizationId?: string): Promise<Folder[]> {
    return new Promise<Folder[]>(async (resolve, reject) => {
      let match;
      if (user && user._id) {
        if (!organizationId) {
          match = {
            $match: {
              // tslint:disable-next-line:no-null-keyword
              'sharedTo.user': Types.ObjectId(user._id), 'folder': { $ne: null as any },
            }
          };
        } else {
          // $or: [{ 'sharedTo.team': { $in: [ObjectId('5b0924a2d0961f00155414e1')] } }, { 'sharedTo.user': ObjectId('5925ab587bb5b800150a3e16') }],
          const orgRole = user.roles.find((role: Role) => { return role.organization._id === organizationId; });
          let teams = [] as Array<Types.ObjectId>;
          if (orgRole) {
            teams = (orgRole as any).teams.map((t: any) => {return Types.ObjectId(t); });
          }
          match = {
            $match: {
              '$or': [{ 'sharedTo.team': { $in: teams } }, { 'sharedTo.user': Types.ObjectId(user._id) }],
              // tslint:disable-next-line:no-null-keyword
              'folder': { $ne: null as any },
              // tslint:disable-next-line:no-null-keyword
              'sharedTo.organization': Types.ObjectId(organizationId)
            }
          };
        }
      } else {
        // tslint:disable-next-line:no-null-keyword
        match = { $match: { 'sharedTo.shareableLink': true, 'folder': { $ne: null as any }  } };
      }
      const aggregations = [
        // tslint:disable-next-line:no-null-keyword
        match,
        { $lookup: { 'from' : 'drive__folders', 'localField' : 'folder', 'foreignField' : '_id', 'as' : 'folder' } },
        { $unwind: { path : '$folder' }},
        { $lookup: { 'from' : 'drive__share', 'localField' : 'folder.parent', 'foreignField' : 'folder', 'as' : 'share_folder_parent'} },
        { $addFields: { 'share_folder_parent_count': { '$size': '$share_folder_parent' } } },
        // tslint:disable-next-line:no-null-keyword
        { $match: folderId ? { 'folder.parent': Types.ObjectId(folderId) }  : { '$or' : [{ 'folder.parent': { $eq: null as any } }, { 'share_folder_parent_count': { $eq: 0 }} ] }},
        { $lookup: { 'from' : 'users', 'localField' : 'folder.createdBy', 'foreignField' : '_id', 'as' : 'folder_createdBy'}},
        { $unwind: { path : '$folder_createdBy' }},
        { $project: { 'folder': 1, 'folder_createdBy': { '_id': 1, 'profile': 1 }}}
      ];
      ShareSchema.aggregate(aggregations).exec((err: any, result: any) => {
        if (err) {
          return reject(err);
        }

        result = _.unionBy(result.map((r: any) => {
          r.folder.createdBy = r.folder_createdBy;
          return r.folder;
        }), 'folder._id');

        resolve(result);
      });
    });
  }

  /**
   * Search users by emails
   * @param emails emails list
   */
  async searchUsersByEmail(emails: string[]): Promise<User[]> {
    return UserSchema.find({ email: { $in: emails }}, '_id email profile') as any;
  }

  /**
   * Search users by emails
   * @param emails emails list
   */
  async searchUsersByIds(ids: string[]): Promise<User[]> {
    return UserSchema.find({ _id: { $in: ids }}, '_id email profile') as any;
  }

  /**
   * Verify if share item exist and access level is correct
   * @param shareItemId id of document or folder
   * @param user user id that require access. Can be null to check shareable link
   * @param level Share access
   */
  async checkAccess(shareItemId: string, user: User, organization: string, level: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {

      const share = await this.findByItemAndUser(shareItemId, user, organization);
      if (!share) {
        return resolve(false);
      }

      /**
       * Share
       */
      if (level === 'READ' && share.sharedTo.level === 'READ') {
        return resolve(true);
      }

      return resolve(false);
    });
  }

  /**
   * Convert share items from email to user
   * @param user user
   */
  async convertEmailToUser(user: User): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const shares = ShareSchema.update({ 'sharedTo.email': user.email },
          { $set: { 'sharedTo.user': user._id }, $unset: { 'sharedTo.email': 1 } }, { multi: true }).exec((err, result) => {
            if (err) {
              return reject(err);
            }
            logger.debug('[SHARE] [convertEmailToUser] done: ', result);
            resolve();
      });
    });
  }

  /**
   * Send email notification about new share
   * @param shares shares list
   * @param document document id
   * @param folder folder id
   */
  private async sendNewShareEmail(shares: Share[], document: string, folder: string)  {

    const userIds = shares.filter((s: Share) => s.sharedTo.user).map((s: Share) => s.sharedTo.user);
    const emailsShares = shares.filter((s: Share) => s.sharedTo.email);

    if (emailsShares.length > 0) {
      this.inviteUserFromShares(emailsShares, document, folder);
    }

    if (userIds.length === 0) {
      return;
    }

    const users: User[] = await this.searchUsersByIds(userIds);

    fs.readFile(path.resolve('./dist/modules/share/templates/new-share.template.html'), 'utf8', async (err, htmlContent) => {
      if (err) {
        return logger.error('[SHARE] Read template: ', err);
      }

      const template = handlebars.compile(htmlContent);
      const emailsToSend: Array<any> = [];

      const sharedType = document ? 'document' : 'folder';
      const shareItem = document ? await this.documentsService.findById(document) : await this.foldersService.findById(folder);
      const sharedLink = `https://${ environment.domain }/drive/shared/${ sharedType }/${ shareItem._id }`;
      const subject = `Shared ${ sharedType } - ${ shareItem.name }`;

      shares.forEach((share: Share) => {
        if (share.sharedTo.shareableLink || !share.sharedTo.user) {
          return;
        }
        const user = users.find((u: User) => u._id === share.sharedTo.user);
        const emailHTML = template({
          isUser: !!user,
          subject: subject,
          shareName: shareItem.name,
          sharedToName: user ? `${ user.profile.firstName } ${ user.profile.lastName }` : '',
          sharedLink: sharedLink,
          sharedType: sharedType,
          sharedByName: `${ share.sharedBy.profile.firstName } ${ share.sharedBy.profile.lastName }`
        });
        const to = user ? `"${ user.profile.firstName } ${ user.profile.lastName }" <${ user.email }>` : share.sharedTo.email;
        emailsToSend.push({
          to: to,
          html: emailHTML
        });
      });

      emailsToSend.forEach(async (options: any) => {
        const mailOptions = {
          to: options.to,
          from: environment.mailer.from,
          subject: subject,
          html: options.html
        };

        try {
          await this.mailManager.sendMail(mailOptions);
          logger.debug('[SHARE] send done. ', mailOptions.to);
        } catch (err) {
          logger.error('[SHARE] Send mail error: ', err);
        }
      });
    });
  }

  /**
   * Send invite email to not-registed user
   * @param shares shares list
   * @param document document id
   * @param folder folder is
   */
  private async inviteUserFromShares(shares: Share[], document: string, folder: string) {
    fs.readFile(path.resolve('./dist/modules/share/templates/user-invite.template.html'), 'utf8', async (err, htmlContent) => {
      if (err) {
        return logger.error('[SHARE] Read template: ', err);
      }

      const template = handlebars.compile(htmlContent);
      const emailsToSend: Array<any> = [];

      const sharedType = document ? 'document' : 'folder';
      const shareItem = document ? await this.documentsService.findById(document) : await this.foldersService.findById(folder);
      const sharedLink = `/drive/shared/${ sharedType }/${ shareItem._id }`;
      const subject = `Invite for ${ sharedType } - ${ shareItem.name }`;

      shares.forEach((share: Share) => {
        if (!share.sharedTo.email) {
          return;
        }
        const inviteLink = `https://${ environment.domain }/users/signup#returnUrl=${ sharedLink }&inviteEmail=${ share.sharedTo.email  }`;
        const emailHTML = template({
          subject: subject,
          shareName: shareItem.name,
          inviteLink: inviteLink,
          sharedType: sharedType,
          sharedByName: `${ share.sharedBy.profile.firstName } ${ share.sharedBy.profile.lastName }`
        });
        const to = share.sharedTo.email;
        emailsToSend.push({
          to: to,
          html: emailHTML
        });
      });

      emailsToSend.forEach(async (options: any) => {
        const mailOptions = {
          to: options.to,
          from: environment.mailer.from,
          subject: subject,
          html: options.html
        };

        try {
          await this.mailManager.sendMail(mailOptions);
          logger.debug('[SHARE] invite send done. ', mailOptions.to);
        } catch (err) {
          logger.error('[SHARE] Send invite mail error: ', err);
        }
      });
    });
  }

  async removeAll(folderIds: string[], allDocuments: string[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      await ShareSchema.remove({ document: { $in: allDocuments }});
      await ShareSchema.remove({ folder: { $in: folderIds }});
      resolve();
    });
  }

}
