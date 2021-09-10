import { Schema, Document as DocumentMongoosee, Model, model } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';

/***
 * Hr Document Type. Data Transfer object type
 */
export type DocumentControl = DocumentMongoosee & {
  type: string;
  position: {
    x: number;
    y: number;
  },
  signature: any;
  document: string;
  pageNumber: number;
  createdAt: Date,
  updatedAt: Date
};

/**
 * Database schema/collection
 */
const documentControlSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['SIGNATURE', 'SIGN_HERE', 'FULL_NAME', 'DATE_SIGNED']
  },
  position: {
    x: Number,
    y: Number
  },
  signature: {
    type: Schema.Types.ObjectId,
    ref: 'Signature'
  },
  pageNumber: Number,
  document: Schema.Types.ObjectId
},
{
  timestamps: true,
  collection: 'drive__documents_controls'
});

export const DocumentControlSchema = Db.connection.model<DocumentControl>('DocumentControl', documentControlSchema);
