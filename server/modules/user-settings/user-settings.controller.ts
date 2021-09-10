import { Controller, Get, Post, Delete, Body, Param, UploadedFile, Put, QueryParam, Res, Req, JsonController, Authorized, CurrentUser } from 'routing-controllers';
import { Inject } from 'typedi';
import { InsertOneWriteOpResult } from 'mongodb';
import { UserSettingsService } from './user-settings.service';
import { UserSettings } from './user-settings.model';
import { Request, Response } from 'express';
import { ShareService } from '../share/share.service';
import { getUserFromRequest } from '@aitheon/core-server';

@JsonController('/api/user-settings')
export class SettingsController {

  @Inject()
  userSettingsService: UserSettingsService;

  @Inject()
  shareService: ShareService;

  @Get('/')
  async me(@Req() request: Request, @Res() response: Response) {
    let current: any;
    try {
      current = await getUserFromRequest(request, []);
    } catch (error) {}
    if (!current) {
      return response.sendStatus(204);
    }

    let settings = await this.userSettingsService.findByUser(current.user._id, current.organization ? current.organization._id : undefined);
    if (!settings._id) {
      await this.shareService.convertEmailToUser(current.user);
      settings = await this.userSettingsService.save(settings);
    }
    return response.json(settings);
  }

}
