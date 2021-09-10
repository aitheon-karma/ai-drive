import { Controller, Get, Post, Put, Delete, Body, BodyParam, UploadedFile, Param, Res, Req, JsonController, QueryParam, Authorized, CurrentUser } from 'routing-controllers';
import { Inject } from 'typedi';
import { InsertOneWriteOpResult } from 'mongodb';
import { ShareService } from './share.service';
import { Share, ShareSchema } from './share.model';
import { Request, Response } from 'express';
import { Current, Role } from '@aitheon/core-server';
import * as _ from 'lodash';
import { ACLService } from '../acl/acl.service';
import { DocumentsService } from '../documents/documents.service';
import { FoldersService } from '../folders/folders.service';
import { Folder } from '../folders/folder.model';
import { DriveDocument } from '../documents/document.model';
import { getUserFromRequest } from '@aitheon/core-server';

@JsonController('/api/share')
export class ShareController {

  constructor() {}

  @Inject()
  shareService: ShareService;

  @Inject()
  documentsService: DocumentsService;

  @Inject()
  foldersService: FoldersService;

  @Inject()
  aclService: ACLService;

  @Get('/documents')
  async documents(@QueryParam('folder') folder: string, @Req() request: Request, @Res() response: Response) {
    let current: any;
    try {
      current = await getUserFromRequest(request, []);
    } catch (error) {}

    const user = current && current.user ? current.user : undefined;
    const organization = current && current.organization ? current.organization._id : undefined;
    if (folder) {
      const shareAccess = await this.shareService.checkAccess(folder, user, organization, 'READ');
      if (!shareAccess) {
        return response.sendStatus(401);
      }
    }

    const list = await this.shareService.findDocuments(user, folder, organization);
    return response.json(list);
  }

  @Get('/documents/:documentId')
  async getDocument(@Param('documentId') documentId: string, @Req() request: Request, @Res() response: Response) {
    const document = await this.documentsService.findById(documentId);
    if (!document) {
      return response.sendStatus(404);
    }

    let current: any;
    try {
      current = await getUserFromRequest(request, []);
    } catch (error) {}

    const user = current && current.user ? current.user : undefined;
    const organization = current && current.organization ? current.organization._id : undefined;

    const shareAccess = await this.shareService.checkAccess(documentId, user, organization, 'READ');
    if (!shareAccess) {
      if (current && current.user) {
        const normalAccess = await this.aclService.checkAccess(_.pick(document, 'service', 'organization', 'createdBy') as any, user, current.organization, 'READ');
        if (!normalAccess.access) {
          return response.sendStatus(401);
        }
      } else {
        return response.sendStatus(401);
      }
    }

    return response.json(document);
  }

  @Get('/folders/:folderId')
  async getFolder(@Param('folderId') folderId: string, @Req() request: Request, @Res() response: Response) {
    const folder = await this.foldersService.findById(folderId);
    if (!folder) {
      return response.sendStatus(404);
    }

    let current: any;
    try {
      current = await getUserFromRequest(request, []);
    } catch (error) {}

    const user = current && current.user ? current.user : undefined;
    const organization = current && current.organization ? current.organization._id : undefined;

    const shareAccess = await this.shareService.checkAccess(folderId, user, organization, 'READ');
    if (!shareAccess) {
      if (current && current.user) {
        const normalAccess = await this.aclService.checkAccess(_.pick(folder, 'service', 'organization', 'createdBy') as any, current.user, current.organization, 'READ');
        if (!normalAccess.access) {
          return response.sendStatus(401);
        }
      } else {
        return response.sendStatus(401);
      }
    }

    return response.json(folder);
  }

  @Get('/folders')
  async folders(@QueryParam('folder') folder: string, @Res() response: Response, @Req() request: Request) {
    let current: any;
    try {
      current = await getUserFromRequest(request, []);
    } catch (error) {}

    const user = current && current.user ? current.user : undefined;
    const organization = current && current.organization ? current.organization._id : undefined;

    if (folder && !await this.shareService.checkAccess(folder, user, organization, 'READ')) {
      return response.sendStatus(401);
    }

    const folders = await this.shareService.findFolders(user, folder, organization);
    return response.json(folders);
  }

  @Authorized()
  @Get('/')
  async list(@CurrentUser() current: Current, @QueryParam('isPublic') isPublic: boolean, @QueryParam('shareItemId') shareItemId: string,  @QueryParam('shareType') shareType: string, @Res() response: Response) {
    let shareItem;
    let document;
    let folder;
    if (shareType === 'document') {
      shareItem = await this.documentsService.findById(shareItemId);
      document = shareItemId;
    } else {
      shareItem = await this.foldersService.findById(shareItemId);
      folder = shareItemId;
    }
    if (!shareItem) {
      return response.sendStatus(404);
    }
    const organizationId = current.organization ? current.organization._id : undefined;
    const normalAccess = await this.aclService.checkAccess(_.pick(shareItem, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'WRITE', isPublic);
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }

    const list = await this.shareService.findByItem(document, folder);
    return response.json(list);
  }

  @Authorized()
  @Post('/')
  async save(
        @CurrentUser() current: Current,
        @QueryParam('isPublic') isPublic: boolean,
        @Body() body: { shareItemId: string, shareType: string, sharedTo: Array<{ user: string, email: string, shareableLink: boolean }> },
        @Res() response: Response
    ) {

    let shareItem: DriveDocument | Folder;
    let document: string;
    let folder: string;

    /**
     * Get share tem
     */
    if (body.shareType === 'document') {
      shareItem = await this.documentsService.findById(body.shareItemId);
      document = body.shareItemId;
    } else {
      shareItem = await this.foldersService.findById(body.shareItemId);
      folder = body.shareItemId;
    }
    if (!shareItem) {
      return response.sendStatus(404);
    }
    /**
     * Check access
     */
    const organizationId = current.organization ? current.organization._id : undefined;
    const normalAccess = await this.aclService.checkAccess(_.pick(shareItem, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'WRITE', isPublic);
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }

    /**
     * Transalate emails to users incase it was not done by client side
     */
    const emails = body.sharedTo.filter((st: { user: string, email: string, shareableLink: boolean }) => {
      return !!st.email;
    }).map((st: { email: string }) => st.email);
    if (emails.length > 0) {
      const usersFromEmails = await this.shareService.searchUsersByEmail(emails);
      if (usersFromEmails.length > 0) {
        body.sharedTo.forEach((st: { user: string, email: string, shareableLink: boolean }) => {
          if (st.email) {
            const user = usersFromEmails.find((u: any) => { return u.email === st.email; });
            if (user) {
              st.email = undefined;
              st.user = user._id.toString();
            }
          }
        });
      }
    }


    const shares = body.sharedTo
      .filter((st: { user: string, email: string, shareableLink: boolean }) => {
        return st.user !== current.user._id;
      })
      .map((st: { user: string, team: string, email: string, organization: string, shareableLink: boolean }) => {
      return {
        document: document,
        folder: folder,
        sharedBy: current.user,
        sharedTo: {
          shareableLink: st.shareableLink,
          user: st.user,
          team: st.team,
          email: st.email,
          organization: st.organization || undefined,
          level: 'READ'
        }
      } as Share;
    });

    /**
     * Banch insert
     */
    const result = await this.shareService.save(shares, document, folder);

    return response.json(result);
  }


}
