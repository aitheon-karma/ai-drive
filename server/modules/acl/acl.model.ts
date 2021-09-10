import { Schema, Document as DocumentMongoosee, Model, model } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';

/***
 * Document Type. Data Transfer object type
 */
export type ACL = DocumentMongoosee & {
  level: string;
  service: {
    _id: string,
    key: string,
    keyName: string
  };
  organization: any,
  user: any;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Database schema/collection
 */
const aclSchema = new Schema({
  level: {
    type: String,
    enum: [
      'READ',
      'WRITE',
      'FULL'
    ],
    default: 'READ'
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  service: {
    _id: String,
    key: String,
    keyName: String
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  public: {
    type: Boolean,
    default: false
  }
},
{
  timestamps: true,
  collection: 'drive__acl'
});

export const ACLSchema = Db.connection.model<ACL>('ACL', aclSchema);
