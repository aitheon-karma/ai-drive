import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';

/***
 * Idea Type. Data Transfer object type
 */
export type Team = Document & {
  _id: string,
  name: string,
  organization: any;
};

/**
 * Database schema/collection
 */
const teamSchema = new Schema({
  name: String,
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  }
},
{
  collection: 'teams'
});

export const TeamSchema = Db.connection.model<Team>('Team', teamSchema);
