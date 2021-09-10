import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';



JSONSchema({ description: 'Service Model' });
export class ServiceModel {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  key: string;

}


@JSONSchema({ description: 'Socket schema' })
export class DriveDocument {


  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  name: string;

  @IsString()
  storeKey: string;

  @IsNumber()
  size: number;

  @IsString()
  contentType: string;

  @IsString()
  organization: string;

  @Type(() => ServiceModel)
  service: ServiceModel;

  @IsString()
  folder: string;

  @IsBoolean()
  shared: boolean;

  @IsDefined()
  createdBy: any;

  @IsString()
  @IsOptional()
  serviceFolder: string;

  @IsString()
  @IsOptional()
  signedUrl: string;

  @IsDateString()
  @IsOptional()
  createdAt: Date;

  @IsDateString()
  @IsOptional()
  updatedAt: Date;

  @IsBoolean()
  @IsOptional()
  isExternal: boolean;

  @IsString()
  @IsOptional()
  thumbnail: string;
}



/**
 * Database schema/collection
 */
const documentSchema = new Schema({
  name: {
    required: true,
    type: String,
    maxlength: 512
  },
  storeKey: String,
  size: Number,
  contentType: String,
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  service: {
    _id: String,
    key: String,
  },
  folder: {
    type: Schema.Types.ObjectId,
    ref: 'Folder'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  private: {
    type: Boolean,
    default: false
  },
  isExternal: {
    type: Boolean
  },
  thumbnail: {
    type: String
  }
},
{
  timestamps: true,
  collection: 'drive__documents'
});

export type IDriveDocument = Document & DriveDocument;
export const DocumentSchema = Db.connection.model<IDriveDocument>('Document', documentSchema);
