import { Schema, Document as DocumentMongoosee, Model, model } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import * as tree from 'eflex-mongoose-path-tree';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsMongoId, IsOptional, IsNumber, IsDateString, IsString, IsDefined, IsBoolean } from 'class-validator';



@JSONSchema({ description: 'Folder' })
export class Folder {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsOptional()
  parent: any;

  @IsOptional()
  organization: any;

  @IsString()
  serviceKey: any;

  @IsDefined()
  createdBy: any;

  @IsBoolean()
  shared: any;

  @IsDateString()
  @IsOptional()
  createdAt: Date;

  @IsDateString()
  @IsOptional()
  updatedAt: Date;

}


/**
 * Database schema/collection
 */
const folderSchema = new Schema({
  name: {
    required: function() {
      return !this.dynamicName || !this.dynamicNameRef;
    },
    type: String,
    maxlength: 512
  },
  dynamicName: {
    type: Schema.Types.ObjectId,
    required: function() {
      return !!this.serviceKey;
    },
    refPath: 'dynamicNameRef'
  },
  dynamicNameRef: {
    type: String,
    required: function() {
      return !!this.dynamicName;
    }
  },
  serviceKey: {
    type: String,
    ref: 'Service'
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Folder'
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
},
{
  timestamps: true,
  collection: 'drive__folders'
});

folderSchema.plugin(tree, {
  onDelete: 'DELETE'
});


export type IFolder = DocumentMongoosee & Folder;
export const FolderSchema = Db.connection.model<IFolder>('Folder', folderSchema);
