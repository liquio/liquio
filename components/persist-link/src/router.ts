// Import.
import express from 'express';

import { asyncLocalStorageMiddleware } from './lib/async_local_storage';
import { getLog } from './lib/context';
import AppIdentHeaders from './lib/app_ident_headers';
import Controllers from './controllers';
import Cors from './lib/cors';
import HttpRequest from './lib/http_request';

/**
 * Router.
 */
class Router {
  /**
   * Route service constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!Router.singleton) {
      this.config = config;
      this.controllers = {};
      Router.singleton = this;
    }

    // Return singleton.
    return Router.singleton;
  }

  /**
   * Init.
   */
  async init() {
    // Init Express app.
    const app = express();
    const logger = getLog();

    app.use(asyncLocalStorageMiddleware);

    // Save request info to log.
    app.use(logger.logRouter.bind(logger));

    // App info in headers.
    AppIdentHeaders.add(app, this.config);

    // Allow CORS.
    Cors.allow(app);

    // Parse body.
    const maxBodySize = this.config.server.maxBodySize;
    HttpRequest.parseBodyJson(app, maxBodySize);

    // Init routes.
    this.initRoutes(app);

    // Start listening.
    await this.listen(app);
  }

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   */
  initRoutes(app) {
    // Init controllers.
    this.controllers = new Controllers(this.config);

    // Test controller.
    app.get('/test/ping', this.controllers.getHandler('test', 'ping'));
    app.get('/test/ping_with_auth', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('test', 'ping'));

    // Monitoring controller.
    app.get('/monitoring/system', this.controllers.getHandler('monitoring', 'system'));

    app.get('/templates', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('link', 'getTemplates'));
    app.get('/templates/:id', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('link', 'findTemplateById'));
    app.post('/templates', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('link', 'createTemplate'));
    app.put('/templates/:id', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('link', 'updateTemplate'));
    app.delete('/templates/:id', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('link', 'deleteTemplate'));

    // Link controller.
    app.get('/:hash', this.controllers.getHandler('link', 'open'));
    app.get('/:hash/template', this.controllers.getHandler('link', 'getTemplate'));
    app.get('/link/:hash', this.controllers.getHandler('link', 'open'));
    app.post('/link', this.controllers.getHandler('auth', 'basicAuth'), this.controllers.getHandler('link', 'create'));
  }

  /**
   * Listen.
   * @private
   * @param {object} app Express app.
   */
  async listen(app) {
    return new Promise((resolve) => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      this.server = app.listen(port, hostname, () => {
        getLog().save('server-listening-started', `Server listening started at "http://${hostname}:${port}".`);
        resolve();
      });
    });
  }

  /**
   * Stop server.
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.server) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          return reject(error);
        }

        resolve(undefined);
      });
    });

    this.server = null;
  }
}

// Export.
export default Router;
