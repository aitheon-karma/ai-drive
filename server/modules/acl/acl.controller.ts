import { Controller, Get, Post, Put, Delete, Body, BodyParam, UploadedFile, Param, Res, Req, JsonController, QueryParam, Authorized, CurrentUser } from 'routing-controllers';
import { Inject } from 'typedi';
import { InsertOneWriteOpResult } from 'mongodb';
import { ACLService } from './acl.service';
import { ACL, ACLSchema } from './acl.model';
import { Request, Response } from 'express';
import { Current, Role } from '@aitheon/core-server';
import * as _ from 'lodash';

@Authorized()
@JsonController('/api/acl')
export class FoldersController {

  constructor() {}

  @Inject()
  aclService: ACLService;

  @Post('/')
  async create(@CurrentUser() current: Current, @Body() acl: ACL, @Res() response: Response) {
    const organization = current.organization && current.organization._id || '';
    if (organization) {
      acl.organization = organization;
      // const role = current.user.roles.find((o9: Role) => { return o.organization._id === current.organization._id; });
      // if (!role) {
      //   return response.sendStatus(403);
      // }
    }
    const result = await this.aclService.create(acl);
    return response.json(result);
  }

  @Put('/:id')
  async update(@CurrentUser() current: Current, @Param('id') id: string, @Body() acl: ACL, @Res() response: Response) {
    acl = _.pick(acl, '_id', 'level', 'organization') as ACL;
    acl.updatedAt = new Date();
    if (acl.organization && acl.organization !== current.organization._id) {
      return response.sendStatus(403);
    }
    const result = await this.aclService.update(acl);
    return response.sendStatus(204);
  }

  @Delete('/:serviceId')
  async remove(@CurrentUser() current: Current, @Param('serviceId') serviceId: string, @QueryParam('keyId') keyId: string, @Res() response: Response) {
    const organizationId = current.organization && current.organization._id || '';
    const acl = await this.aclService.findOneByUser(current.user._id, serviceId, keyId, organizationId);
    if (!acl) {
      return response.sendStatus(404);
    }
    if (acl.level !== 'WRITE' && acl.level !== 'FULL') {
      return response.sendStatus(403);
    }
    await this.aclService.remove(acl._id);
    return response.sendStatus(204);
  }

  @Get('/:serviceId/keys')
  async serviceKeys(@CurrentUser() current: Current, @Param('serviceId') serviceId: string, @Res() response: Response) {
    const organizationId = current.organization && current.organization._id || '';
    const acls = await this.aclService.findServiceKeys(current.user._id, serviceId, organizationId);
    return response.json(acls);
  }

}
