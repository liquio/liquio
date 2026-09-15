import express from 'express';

import { PingController } from '../controllers/ping';
import { MonitorController } from '../controllers/monitor';
import { AppIdentHeaders } from '../lib/app_ident_headers';
import { Cors } from '../lib/cors';
import { asyncLocalStorageMiddleware } from '../lib/async_local_storage';

/**
 * Router service.
 */
export class RouterService {
  static singleton: RouterService;
  config: any;
  controllers: any;

  /**
   * Route service constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!RouterService.singleton) {
      this.config = config;
      RouterService.singleton = this;
    }

    // Return singleton.
    return RouterService.singleton;
  }

  /**
   * Init.
   */
  async init() {
    // Init Express app.
    const app = express();

    app.use(asyncLocalStorageMiddleware);

    // Save request info to log.
    app.use(global.log.logRouter.bind(global.log));

    // App info in headers.
    AppIdentHeaders.add(app, this.config);

    // Allow CORS.
    Cors.allow(app);

    // Init routes.
    this.controllers = this.initRoutes(app);

    // Start listening.
    await this.listen(app);
  }

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   * @returns {object} Express app.
   */
  initRoutes(app: any) {
    const pingController = new PingController(this.config);
    const monitorController = new MonitorController(this.config);

    app.get('/test/ping', pingController.ping.bind(pingController));
    app.get('/healthz', pingController.healthz.bind(pingController));
    app.get('/monitors/system', monitorController.system.bind(monitorController));

    return {
      ping: pingController,
      monitor: monitorController,
    };
  }

  /**
   * Listen.
   * @private
   * @param {object} app Express app.
   */
  async listen(app: any): Promise<void> {
    return new Promise((resolve) => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      app.listen(port, hostname, () => {
        global.log.save('server-listening-started', { url: `http://${hostname}:${port}` });
        resolve();
      });
    });
  }
}
