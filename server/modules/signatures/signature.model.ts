import { Schema, Document as DocumentMongoosee, Model, model } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';

/***
 *Document Type. Data Transfer object type
 */
export type Signature = DocumentMongoosee & {
  user: any;
  storeKey: string;
  size: number;
  createdAt: Date;
  updatedAt: Date
};

/**
 * Database schema/collection
 */
const signatureSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  storeKey: String,
  size: Number
},
{
  timestamps: true,
  collection: 'drive__signatures'
});

export const SignatureSchema = Db.connection.model<Signature>('Signature', signatureSchema);
