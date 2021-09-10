import { Service } from 'typedi';
import * as mongoose from 'mongoose';
import { environment } from '../environment';
import { logger } from './logger';

/**
 * Database manager
 */
class Db {

  connection: mongoose.Connection;

  constructor() {
    this.init();
  }

  /**
   * Create connection and connect to DB from environment
   */
  init() {
    const dbUri = environment.db.uri;
    const options = {
      reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
      reconnectInterval: 500, // Reconnect every 500ms
      poolSize: 10, // Maintain up to 10 socket connections
      bufferMaxEntries: 0
    };

    logger.debug('[DB] Init');

    this.connection = mongoose.createConnection(dbUri, options);
    this.connection.on('error', (err: any) => {
      logger.debug('[DB] MongoDB connection error. Please make sure MongoDB is running.');
      // process.exit();
    })
    .on('disconnected', () => {
      logger.debug('[DB] MongoDB Disconnected! Please make sure MongoDB is running.');
      // process.exit();
    })
    .once('open', () => {
      logger.debug('[DB] MongoDB connected');
    });
  }
}

export default new Db();
