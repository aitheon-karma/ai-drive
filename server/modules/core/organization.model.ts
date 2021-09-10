import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';

/***
 * Idea Type. Data Transfer object type
 */
export type Organization = Document & {
  _id: string,
  name: string,
  services: Array<string>
};

/**
 * Database schema/collection
 */
const organizationSchema = new Schema({
  name: String
},
{
  collection: 'organizations'
});

export const OrganizationSchema = Db.connection.model<Organization>('Organization', organizationSchema);
