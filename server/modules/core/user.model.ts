import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { Role } from '@aitheon/core-server';

/***
 * Idea Type. Data Transfer object type
 */
export type User = Document & {
  _id: string,
  email: string,
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string;
  },
  roles: Role[]
};

/**
 * Database schema/collection
 */
const userSchema = new Schema({
  email: String,
  profile: {
    firstName: String,
    lastName: String,
    avatarUrl: String
  },
  roles: [Object]
},
{
  collection: 'users'
});

export const UserSchema = Db.connection.model<User>('User', userSchema);
