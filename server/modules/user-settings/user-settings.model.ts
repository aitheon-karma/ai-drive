
import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { environment } from '../../environment';

/***
 * Idea Type. Data Transfer object type
 */
export type UserSettings = Document & {
  user: string,
  organization: string,
  space: {
    used: number,
    total: number
  }
};

/**
 * Database schema/collection
 */
const userSettingsSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    sparse: true
  },
  organization: {
    type: Schema.Types.ObjectId,
    sparse: true
  },
  space: {
    used: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: environment.defaultLimitDrive
    }
  }
},
{
  timestamps: true,
  collection: 'drive__user_settings'
});

export const UserSettingsSchema = Db.connection.model<UserSettings>('UserSettings', userSettingsSchema);
