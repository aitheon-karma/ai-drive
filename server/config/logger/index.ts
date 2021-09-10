
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as winston from 'winston';
import { environment } from '../../environment';
import { LogModel } from './log.model';

// list of valid formats for the logging
const validFormats = ['combined', 'common', 'dev', 'short', 'tiny'];

const DbLogger = winston.transports.DbLogger = function (options: any) {
  //
  // Name this logger
  //
  this.name = 'DbLogger';

  //
  // Set the level from your options
  //
  this.level = options.level || 'audit_trail',
  this.handleExceptions = true;
};

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(DbLogger, winston.Transport);

DbLogger.prototype.log = function (level: any, msg: any, meta: any, callback: Function) {
  // if this log level is not in allowed, then just go next
  // undefined - is for expections
  if (!/^(error)|^(info)|^(warn)|^(audit_trail)/.test(level) && level !== undefined) {
    return callback(undefined, true);
  }

  // Mapping level to log type
  const type = level && level.toUpperCase() || 'UNDEFINED';

  const logModel = new LogModel({
    service: environment.service._id,
    message: msg,
    user: meta.user,
    type: type,
    organization: meta.organization,
    parseType: meta.parseType,
    // take everything except user and organization, parseType
    data: _.pickBy(meta, (value, key) => {
      return !/^(organization)|^(user)|^(parseType)/.test(key);
    })
  });
  logModel.save((err: any) => {
    return callback(err, true);
  });
};

// Instantiating the default winston application logger with the Console
// transport
export const logger = new winston.Logger({
  levels: { error: 0, warn: 1, info: 2, audit_trail: 3, debug: 4, silly: 5 },
  colors: { error: 'red', warn: 'yellow', info: 'green', audit_trail: 'cyan', debug: 'blue', silly: 'magenta' },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      colorize: true,
      showLevel: true,
      handleExceptions: true,
      humanReadableUnhandledException: true
    }),
    // new winston.transports.DbLogger({
    //   level: 'audit_trail',
    //   handleExceptions: true,
    //   humanReadableUnhandledException: true,
    // })
  ],
  exitOnError: false
});

// A stream object with a write function that will call the built-in winston
// logger.info() function.
// Useful for integrating with stream-related mechanism like Morgan's stream
// option to log all HTTP requests to a file
logger.stream = {
  write: (msg: any) => {
    logger.debug(msg);
  }
};

/**
 * Instantiate a winston's File transport for disk file logging
 *
 */
logger.setupFileLogger = function setupFileLogger() {

  const fileLoggerTransport = this.getLogOptions();
  if (!fileLoggerTransport) {
    return false;
  }

  try {
    // Check first if the configured path is writable and only then
    // instantiate the file logging transport
    if (fs.openSync(fileLoggerTransport.filename, 'a+')) {
      logger.add(winston.transports.File, fileLoggerTransport);
    }

    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.log();
      console.log('An error has occured during the creation of the File transport logger.');
      console.log(err);
      console.log();
    }

    return false;
  }

};

/**
 * The options to use with winston logger
 *
 * Returns a Winston object for logging with the File transport
 */
logger.getLogOptions = function getLogOptions() {

  const _config = _.clone(environment);
  const configFileLogger = _config.log.fileLogger;

  if (!_.has(_config, 'log.fileLogger.directoryPath') || !_.has(_config, 'log.fileLogger.fileName')) {
    console.log('unable to find logging file configuration');
    return false;
  }

  if (!fs.existsSync(configFileLogger.directoryPath)) {
    fs.mkdirSync(configFileLogger.directoryPath);
  }

  const logPath = configFileLogger.directoryPath + '/' + configFileLogger.fileName;

  return {
    level: configFileLogger.level || 'debug',
    colorize: false,
    filename: logPath,
    timestamp: true,
    maxsize: configFileLogger.maxsize ? configFileLogger.maxsize : 10485760,
    maxFiles: configFileLogger.maxFiles ? configFileLogger.maxFiles : 2,
    json: (_.has(configFileLogger, 'json')) ? configFileLogger.json : false,
    eol: '\n',
    tailable: true,
    showLevel: true,
    handleExceptions: true,
    humanReadableUnhandledException: true
  };

};

/**
 * The options to use with morgan logger
 *
 * Returns a log.options object with a writable stream based on winston
 * file logging transport (if available)
 */
logger.getMorganOptions = function getMorganOptions() {

  return {
    stream: logger.stream
  };

};

/**
 * The format to use with the logger
 *
 * Returns the log.format option set in the current environment configuration
 */
logger.getLogFormat = function getLogFormat() {
  let format = environment.log && environment.log.format ? environment.log.format.toString() : 'combined';

  // make sure we have a valid format
  if (!_.includes(validFormats, format)) {
    format = 'combined';

    if (process.env.NODE_ENV !== 'test') {
      console.log();
      console.log(`Warning: An invalid format was provided. The logger will use the default format of '${ format }'`);
      console.log();
    }
  }

  return format;
};

logger.setupFileLogger();

logger.rewriters.push(function(level: any, msg: any, meta: any) {
  if (meta && meta.req) {
    meta.user = meta.req.currentUser ? meta.req.currentUser._id : 'No User in request';
    meta.organization = meta.req.currentOrganization ? meta.req.currentOrganization._id.toString() : 'No Organization in request';
    // remove req object because it's very large no need after filter
    _.unset(meta, 'req');
  }
  return meta;
});