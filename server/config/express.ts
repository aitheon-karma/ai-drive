import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as healthcheck from 'healthcheck-middleware';
import * as compression from 'compression';
import { useExpressServer, useContainer, Action } from 'routing-controllers';
import { Container } from 'typedi';
import { environment } from '../environment';
import * as auth from './auth';
import * as hbs from 'express-hbs';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';

export class ExpressConfig {

  app: express.Express;

  constructor() {
    this.app = express();

    // setupLogging(this.app);

    // if (process.env.ENABLE_CORS) {
    //   // console.log('Changed');
    //   this.app.use(cors({
    //     origin: '*',
    //     allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Accept', 'organization-id', 'organization-domain'],
    //     methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS']
    //   }));
    // }
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(compression());

    this.app.engine('html', hbs.express4({
      extname: '.html'
    }));
    this.app.set('view engine', '.html');
    // TODO: change to dist it later
    this.app.set('views', path.resolve('./server'));
    this.app.use(cookieParser());
    this.app.use('/api/health', healthcheck());

    // Point static path to dist
    this.app.use(express.static(path.resolve('./dist/public')));

    this.app.use('/pdfjs-dist', express.static(path.resolve('./node_modules/pdfjs-dist')));

    this.app.get('/api', (req, res) => {
      res.json({
        service: `${ environment.service._id } service`,
        time: new Date()
      });
    });

    /**
     * Angular HTML5 mode
     * Catch all other routes and return the index file
     */
    this.app.get(/^\/(?!api).*/, this.serveIndex);

    this.setupControllers();
  }

  serveIndex(req: any, res: any) {
    res.sendFile(path.resolve('./dist/public/index.html'));
  }

  setupControllers() {
    const rootPath = path.resolve('./dist');

    const corsConfig = {
      origin: function(origin: string, callback: any) {
        console.log(origin);
        // tslint:disable-next-line:no-null-keyword
        callback(null, true);
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Accept', 'organization-id', 'organization-domain'],
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS']
    };

    useContainer(Container);
    useExpressServer(this.app, {
      authorizationChecker: auth.authorizationChecker,
      currentUserChecker: auth.currentUserChecker,
      middlewares: [`${ rootPath }/modules/**/*.middleware.js`],
      interceptors: [`${ rootPath }/modules/**/*.interceptor.js`],
      controllers: [`${ rootPath }/modules/**/*.controller.js`],
      defaultErrorHandler: false,
      cors: process.env.ENABLE_CORS ? corsConfig : false
    });
  }

}