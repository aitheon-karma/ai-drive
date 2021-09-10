import { Controller, Get, Post, Put, Delete, Body, BodyParam, UploadedFile, Param, Res, Req, JsonController, QueryParam, Authorized, CurrentUser } from 'routing-controllers';
import { Inject } from 'typedi';
import { InsertOneWriteOpResult } from 'mongodb';
import { FoldersService } from './folders.service';
import { Folder, FolderSchema } from './folder.model';
import { Request, Response } from 'express';
import { Current } from '@aitheon/core-server';
import { ACLService } from '../acl/acl.service';
import * as _ from 'lodash';
import { ShareService } from '../share/share.service';
import { DocumentsService } from '../documents/documents.service';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Authorized()
@JsonController('/api/folders')
export class FoldersController {

  constructor() {}

  @Inject()
  foldersService: FoldersService;

  @Inject()
  aclService: ACLService;

  @Inject()
  shareService: ShareService;

  @Inject()
  documentsService: DocumentsService;

  @Get('/')
  @OpenAPI({ summary: 'List of folders', operationId: 'list' })
  @ResponseSchema(Folder, {isArray: true})
  async list(@CurrentUser() current: Current, @Res() response: Response, @QueryParam('parent') parent: string) {
    const organizationId = current.organization && current.organization._id || '';

    if (parent) {
      const folder = await this.foldersService.findById(parent);
      if (!folder) {
        return response.sendStatus(404);
      }
      const normalAccess = await this.aclService.checkAccess(_.pick(folder, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'READ');
      if (!normalAccess.access) {
        return response.sendStatus(401);
      }
    }

    const folders = await this.foldersService.find(current.user._id, organizationId, parent);
    return response.json(folders);
  }

  @Get('/services/:serviceId')
  @OpenAPI({ summary: 'List of service folders', operationId: 'listServicesFolders' })
  @ResponseSchema(Folder, {isArray: true})
  async listServicesFolders(@CurrentUser() current: Current, @Res() response: Response, @Param('serviceId') serviceId: string) {
    const organizationId = current.organization && current.organization._id;
    let folders = await this.foldersService.findServiceFolders(current, serviceId, organizationId);
    folders = folders.filter((folder: any) => folder.hasAccess);
    return response.json(folders);
  }

  @Get('/:id/breadcrumbs')
  @OpenAPI({ summary: 'List of ancestors', operationId: 'getAncestors' })
  @ResponseSchema(Folder, {isArray: true})
  async getAncestors(@CurrentUser() current: Current, @Res() response: Response, @Param('id') id: string) {
    const organizationId = current.organization && current.organization._id || '';

    const folder = await this.foldersService.findById(id);
      if (!folder) {
        return response.sendStatus(404);
      }
      const normalAccess = await this.aclService.checkAccess(_.pick(folder, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'READ');
      if (!normalAccess.access) {
        return response.sendStatus(401);
      }

    const folders = await this.foldersService.getAncestors(id);
    return response.json(folders);
  }


  @Post('/')
  @OpenAPI({ summary: 'Create folder', operationId: 'create' })
  @ResponseSchema(Folder)
  async create(@CurrentUser() current: Current, @Body() folder: Folder, @Res() response: Response) {
    folder.createdBy = current.user._id;
    const organizationId = current.organization && current.organization._id || '';
    if (organizationId) {
      folder.organization = organizationId;
    }
    const normalAccess = await this.aclService.checkAccess(_.pick(folder, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'WRITE');
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }
    const result = await this.foldersService.create(folder);

    if (folder.parent) {
      this.shareService.checkAndCreateShare(folder.parent, undefined, result._id.toString());
    }

    return response.json(result);
  }

  @Put('/:id')
  @OpenAPI({ summary: 'Update folder', operationId: 'update' })
  async update(@CurrentUser() current: Current, @Param('id') id: string, @Body() folder: Folder, @Res() response: Response) {
    folder.updatedAt = new Date();
    const exist = await this.foldersService.findById(id);
    const organizationId = current.organization && current.organization._id || '';
    const normalAccess = await this.aclService.checkAccess(_.pick(exist, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'FULL');
    if (!normalAccess.access) {
      return response.sendStatus(401);
    }
    const result = await this.foldersService.update(folder);
    return response.sendStatus(204);
  }

  @Delete('/:id')
  @OpenAPI({ summary: 'Delete folder', operationId: 'remove' })
  async remove(@CurrentUser() current: Current, @Param('id') id: string, @Res() response: Response) {
    try {
      const organizationId = current.organization && current.organization._id || '';
      const exist = await this.foldersService.findById(id);
      const normalAccess = await this.aclService.checkAccess(_.pick(exist, 'service', 'organization', 'createdBy') as any, current.user, organizationId, 'FULL');
      if (!normalAccess.access) {
        return response.sendStatus(401);
      }
      const childrens = await this.foldersService.findChildren(exist._id.toString());
      const folderIds = childrens.map((f: Folder) => {
        return f._id.toString();
      });
      folderIds.push(exist._id.toString());

      const allDocuments = await this.documentsService.removeByFolders(folderIds);
      const result = await this.foldersService.remove(id);

      await this.shareService.removeAll(folderIds.concat(id), allDocuments);

      return response.sendStatus(204);
    } catch (err) {
      return response.status(500).send(err.toString());
    }
  }

}
