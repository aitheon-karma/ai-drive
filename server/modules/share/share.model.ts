import { Schema, Document as DocumentMongoosee, Model, model } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { DriveDocument } from '../documents/document.model';
import { Folder } from '../folders/folder.model';


/***
 * Document Type. Data Transfer object type
 */
export type Share = DocumentMongoosee & {
  document: DriveDocument | string;
  folder: Folder | string;
  sharedBy: any;
  sharedTo: {
    shareableLink: boolean,
    user: any,
    team: any;
    organization: any,
    email: string,
    level: string
  };
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Database schema/collection
 */
const shareSchema = new Schema({
  document: {
    type: Schema.Types.ObjectId,
    ref: 'Document'
  },
  folder: {
    type: Schema.Types.ObjectId,
    ref: 'Folder'
  },
  sharedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  sharedTo: {
    shareableLink: {
      type: Boolean,
      default: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team'
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization'
    },
    email: String,
    level: {
      default: 'READ',
      type: String,
      enum: [
        'READ',
        'WRITE'
      ]
    }
  }
},
{
  timestamps: true,
  collection: 'drive__share'
});

export const ShareSchema = Db.connection.model<Share>('Share', shareSchema);
