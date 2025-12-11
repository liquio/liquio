import path from 'path';
import express, { Express } from 'express';
import { Server } from 'http';

import Log from './lib/log';
import Cors from './lib/cors';
import AppIdentHeaders from './lib/app_ident_headers';
import HttpRequest from './lib/http_request';
import Controllers from './controllers';
import Validators from './validators';
import { asyncLocalStorageMiddleware } from './lib/async_local_storage';

/**
 * Express Request with application metadata.
 */
export interface Request extends express.Request {
  traceId?: string;
  traceMeta?: any;
  auth?: any;
  accessInfo?: any;
}

/**
 * Express Response with application metadata.
 */
export interface Response extends express.Response {
  handlingInfo?: {
    requestMeta: {
      method: string;
      url: string;
      userAgent: string;
      userIp: {
        remoteAddress: string;
        xForwardedFor: string | string[];
      };
    };
  };
}

/**
 * Router.
 */
export default class Router {
  private static singleton: Router;
  private config: any;
  public controllers: { [key: string]: any };
  private validators: { [key: string]: any };
  private log: Log;

  /**
   * Route service constructor.
   */
  constructor(config: any) {
    // Define singleton.
    if (!Router.singleton) {
      this.config = config;
      this.log = Log.getInstance();
      this.controllers = {};
      this.validators = {};
      Router.singleton = this;
    }

    // Return singleton.
    return Router.singleton;
  }

  /**
   * Init.
   */
  async init(): Promise<Server> {
    // Init Express app.
    const app = express();

    // Run request in async local storage.
    app.use(asyncLocalStorageMiddleware);

    // Save request info to log.
    app.use(this.log.logRouter.bind(this.log));

    // App info in headers.
    AppIdentHeaders.add(app, global.config);

    // Allow CORS.
    Cors.allow(app);

    // Parse body.
    const maxBodySize = this.config.server.maxBodySize;
    HttpRequest.parseBodyJson(app, maxBodySize);

    // Body parser broke local storage context. Init storage again if need it.
    app.use(asyncLocalStorageMiddleware);

    // Init routes.
    this.initRoutes(app);

    // Start listening.
    let server: Server;
    await this.listen(app).then((serverInstance) => (server = serverInstance));

    return server;
  }

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   */
  initRoutes(app: Express) {
    // Init controllers.
    this.controllers = new Controllers(this.config);
    this.validators = new Validators(this.config);

    // Define.
    const allRoutes = {
      // Test controller.
      'GET /test/ping': {
        controller: {
          name: 'test',
          method: 'ping'
        }
      },
      'GET /test/ping_with_auth': {
        controller: {
          name: 'test',
          method: 'ping'
        },
        basicAuth: true
      },

      // Registers controller.
      'GET /registers': {
        validator: { name: 'registers', method: 'getAll' },
        controller: { name: 'registers', method: 'getAll' },
        basicAuth: true
      },
      'GET /registers/:id': {
        validator: { name: 'registers', method: 'findById' },
        controller: { name: 'registers', method: 'findById' },
        basicAuth: true
      },
      'POST /registers': {
        validator: { name: 'registers', method: 'create' },
        controller: { name: 'registers', method: 'create' },
        basicAuth: true
      },
      'PUT /registers/:id': {
        validator: { name: 'registers', method: 'update' },
        controller: { name: 'registers', method: 'update' },
        basicAuth: true
      },
      'DELETE /registers/:id': {
        validator: { name: 'registers', method: 'delete' },
        controller: { name: 'registers', method: 'delete' },
        basicAuth: true
      },
      'GET /registers/:id/export': {
        validator: { name: 'registers', method: 'export' },
        controller: { name: 'registers', method: 'export' },
        basicAuth: true
      },
      'POST /registers/import': {
        validator: { name: 'registers', method: 'import' },
        controller: { name: 'registers', method: 'import' },
        basicAuth: true
      },
      'GET /registers/:id/stream-export': {
        validator: { name: 'registers', method: 'export' },
        controller: { name: 'registers', method: 'streamExport' },
        basicAuth: true
      },
      'POST /registers/stream-import': {
        validator: { name: 'registers', method: 'import' },
        controller: { name: 'registers', method: 'streamImport' },
        basicAuth: true
      },
      // Keys controller.
      'GET /keys': {
        validator: { name: 'keys', method: 'getAll' },
        controller: { name: 'keys', method: 'getAll' },
        basicAuth: true
      },
      'GET /keys/synced': {
        validator: { name: 'keys', method: 'syncedByIds' },
        controller: { name: 'keys', method: 'syncedByIds' },
        basicAuth: true
      },
      'GET /keys/allSynced': {
        validator: { name: 'keys', method: 'allSynced' },
        controller: { name: 'keys', method: 'allSynced' },
        basicAuth: true
      },
      'GET /keys/:id': {
        validator: { name: 'keys', method: 'findById' },
        controller: { name: 'keys', method: 'findById' },
        basicAuth: true
      },
      'GET /keys/:id/history': {
        validator: { name: 'keys', method: 'findHistoryByKeyId' },
        controller: { name: 'keys', method: 'findHistoryByKeyId' },
        basicAuth: true
      },
      'POST /keys/:id/reindex': {
        validator: { name: 'keys', method: 'reindex' },
        controller: { name: 'keys', method: 'reindex' },
        basicAuth: true
      },
      'POST /keys/:id/afterhandlers-reindex': {
        validator: { name: 'keys', method: 'afterhandlersReindex' },
        controller: { name: 'keys', method: 'afterhandlersReindex' },
        basicAuth: true
      },
      'POST /keys/:id/process-encryption': {
        validator: { name: 'keys', method: 'processEncryption' },
        controller: { name: 'keys', method: 'processEncryption' },
        basicAuth: true
      },
      'POST /keys': {
        validator: { name: 'keys', method: 'create' },
        controller: { name: 'keys', method: 'create' },
        basicAuth: true
      },
      'PUT /keys/:id': {
        validator: { name: 'keys', method: 'update' },
        controller: { name: 'keys', method: 'update' },
        basicAuth: true
      },
      'DELETE /keys/:id': {
        validator: { name: 'keys', method: 'delete' },
        controller: { name: 'keys', method: 'delete' },
        basicAuth: true
      },

      // Records controller.
      'GET /records': {
        validator: { name: 'records', method: 'getAll' },
        controller: { name: 'records', method: 'getAll' },
        basicAuth: true
      },
      'POST /records-by-post': {
        validator: { name: 'records', method: 'getAllByPost' },
        controller: { name: 'records', method: 'getAll' },
        basicAuth: true
      },
      'GET /records/search': {
        validator: { name: 'records', method: 'search' },
        controller: { name: 'records', method: 'search' },
        basicAuth: true
      },
      'GET /records/:id': {
        validator: { name: 'records', method: 'findById' },
        controller: { name: 'records', method: 'findById' },
        basicAuth: true
      },
      'GET /records/:id/history': {
        validator: { name: 'records', method: 'findHistoryByRecordId' },
        controller: { name: 'records', method: 'findHistoryByRecordId' },
        basicAuth: true
      },
      'POST /records': {
        validator: { name: 'records', method: 'create' },
        controller: { name: 'records', method: 'create' },
        basicAuth: true
      },
      'POST /records/bulk': {
        validator: { name: 'records', method: 'bulkImport' },
        controller: { name: 'records', method: 'bulkImport' },
        basicAuth: true
      },
      'POST /records/bulk-by-person': {
        validator: { name: 'records', method: 'bulkCreateByPerson' },
        controller: { name: 'records', method: 'bulkCreateByPerson' },
        basicAuth: true
      },
      'POST /records/filter': {
        validator: { name: 'records', method: 'getAllFiltered' },
        controller: { name: 'records', method: 'getAllFiltered' },
        basicAuth: true
      },
      'PATCH /records/:id': {
        validator: { name: 'records', method: 'updatePatch' },
        controller: { name: 'records', method: 'updatePatch' },
        basicAuth: true
      },
      'PUT /records/:id': {
        validator: { name: 'records', method: 'update' },
        controller: { name: 'records', method: 'update' },
        basicAuth: true
      },
      'DELETE /records/bulk': {
        validator: { name: 'records', method: 'deleteBulk' },
        controller: { name: 'records', method: 'deleteBulk' },
        basicAuth: true
      },
      'DELETE /records/:id': {
        validator: { name: 'records', method: 'delete' },
        controller: { name: 'records', method: 'delete' },
        basicAuth: true
      },

      // Access log controller.
      'GET /access-log': {
        validator: { name: 'accessLog', method: 'getAll' },
        controller: { name: 'accessLog', method: 'getAll' },
        basicAuth: true
      },

      // Custom controller.
      'GET /custom/post-code': {
        validator: { name: 'custom', method: 'getPostCode' },
        controller: { name: 'custom', method: 'getPostCode' },
        basicAuth: true
      },

      // Export controller.
      'POST /export/start-preparing': {
        validator: { name: 'export', method: 'startPreparingToExport' },
        controller: { name: 'export', method: 'startPreparingToExport' },
        basicAuth: true
      },
      'GET /export/:exportId/status': {
        validator: { name: 'export', method: 'getExportStatus' },
        controller: { name: 'export', method: 'getExportStatus' },
        basicAuth: true
      },
      'GET /export/:exportId/data': {
        validator: { name: 'export', method: 'getExportData' },
        controller: { name: 'export', method: 'getExportData' },
        basicAuth: true
      },

      // Import controller.
      'POST /import/start': {
        controller: { name: 'import', method: 'startImport' },
        basicAuth: true
      },
      'GET /import/:importId/status': {
        validator: { name: 'import', method: 'getImportStatusWithDetails' },
        controller: { name: 'import', method: 'getImportStatusWithDetails' },
        basicAuth: true
      },

      // Rollback controller.
      'POST /rollback/start': {
        validator: { name: 'rollback', method: 'startRollback' },
        controller: { name: 'rollback', method: 'startRollback' },
        basicAuth: true
      },
      'GET /rollback/:rollbackId/status': {
        validator: { name: 'rollback', method: 'getRollbackStatusWithDetails' },
        controller: { name: 'rollback', method: 'getRollbackStatusWithDetails' },
        basicAuth: true
      },
      'POST /rollback/record': {
        validator: { name: 'rollback', method: 'rollbackRecord' },
        controller: { name: 'rollback', method: 'rollbackRecord' },
        basicAuth: true
      }
    };

    for (const routeKey in allRoutes) {
      // Define params.
      const [requestMethod, requestUrl] = routeKey.split(' ');
      const routeDescription = allRoutes[routeKey];

      const validatorDescription = routeDescription.validator;
      const controllerDescription = routeDescription.controller;
      const basicAuthDescription = routeDescription.basicAuth;

      // Init all handlers.
      const handlers = [];
      basicAuthDescription ? handlers.push(this.controllers.getHandler('auth', 'basicAuth')) : false;
      validatorDescription
        ? handlers.push(this.validators.getHandler(validatorDescription.name, validatorDescription.method)) &&
          handlers.push(this.validators.getValidationResultHandler())
        : false;
      controllerDescription ? handlers.push(this.controllers.getHandler(controllerDescription.name, controllerDescription.method)) : false;

      // Define route.
      app[requestMethod.toLowerCase()](requestUrl, ...handlers);
    }

    // Internal server error handler.
    app.use((error: Error, req: Request, res: Response, _next: Function) => {
      global.log.save('error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send({ error: { message: 'Internal server error', code: 500, traceId: req.traceId } });
    });

    // Show static.
    app.use(express.static(path.join(__dirname, 'static')));
  }

  /**
   * Listen.
   * @private
   * @param {object} app Express app.
   */
  async listen(app: Express): Promise<Server> {
    return new Promise((resolve) => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      const serverInstance = app.listen(port, hostname, () => {
        this.log.save('server-listening-started', { url: `http://${hostname}:${port}` });
      });

      resolve(serverInstance);
    });
  }
}
