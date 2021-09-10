import { Controller, Get, Post, Delete, Body, BodyParam, UploadedFile, Param, Res, Req, JsonController, QueryParam, Authorized, CurrentUser, Put, Redirect } from 'routing-controllers';
import { Inject } from 'typedi';
import { InsertOneWriteOpResult } from 'mongodb';
import { SignaturesService } from './signatures.service';
import { Signature, SignatureSchema } from './signature.model';
import { Request, Response } from 'express';
import { S3Manager } from '../core/s3-manager';
import { environment } from '../../environment';
import { Current, User } from '@aitheon/core-server';
import * as _ from 'lodash';
import { DocumentControlsService } from '../documents/document-controls.service';

@Authorized()
@JsonController('/api/signatures')
export class SignaturesController {

  s3Manager: S3Manager;

  constructor() {
    this.s3Manager = new S3Manager();
  }

  @Inject()
  signaturesService: SignaturesService;

  @Inject()
  documentControlsService: DocumentControlsService;

  @Get('/')
  async list(@CurrentUser() current: Current, @Res() response: Response) {

    const documents = await this.signaturesService.findByUser(current.user._id);

    return response.json(documents);
  }

  @Post('/')
  async create(@UploadedFile('file') file: any, @CurrentUser() current: Current, @Body() signature: Signature, @Res() response: Response) {

    signature.user = current.user._id;
    const result = (await this.signaturesService.create(signature, file)).toObject() as Signature;

    return response.json({ _id: result._id.toString() });
  }

  @Get('/:id')
  async getById(@Param('id') id: string, @Res() response: Response,  @CurrentUser() current: Current) {
    const signature = await this.signaturesService.findById(id);
    if (!signature) {
      return response.sendStatus(404);
    }

    if (signature.user.toString() != current.user._id) {
      return response.sendStatus(401);
    }

    const stream = this.signaturesService.getStream(signature);
    return response.pipe(stream);
  }


  @Delete('/:id')
  async remove(@CurrentUser() current: Current, @Param('id') id: string, @Res() response: Response) {
    const signature = await this.signaturesService.findById(id);
    if (signature.user.toString() != current.user._id) {
      return response.sendStatus(401);
    }
    const controls = await this.documentControlsService.countBySignature(id);
    if (controls > 0) {
      return response.status(422).send({ message: 'Signature used at editable documents.' });
    }
    const result = await this.signaturesService.remove(id);
    return response.sendStatus(204);
  }

}
