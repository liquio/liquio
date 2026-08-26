import express from 'express';
import PingController from '../controllers/ping';
import MonitorController from '../controllers/monitor';
import { AppIdentHeaders } from '../lib/app_ident_headers';
import { Cors } from '../lib/cors';
import { asyncLocalStorageMiddleware } from '@liquio/back-core';

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
  async init(): Promise<void> {
    // Init Express app.
    const app = express();

    // Async local storage.
    app.use(asyncLocalStorageMiddleware);

    // Save request info to log.
    app.use(global.log.logRouter.bind(global.log));

    // App info in headers.
    (AppIdentHeaders.add as any)(app, global.config);

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
   * @param {express.Application} app Express app.
   * @returns {object} Controllers.
   */
  initRoutes(app: any): any {
    const pingController = new PingController(this.config);
    const monitorController = new MonitorController(this.config);

    app.get('/test/ping', pingController.ping.bind(pingController));
    app.get('/monitors/system', monitorController.system.bind(monitorController));
    app.get('/test/ping/minjust', pingController.pingMinjust.bind(pingController));
    app.get('/test/ping/minjustUsr', pingController.pingMinjustUsr.bind(pingController));
    app.get('/test/ping/minjustDoc', pingController.pingMinjustDoc.bind(pingController));
    app.get('/test/ping/trembita', pingController.pingTrembita.bind(pingController));
    app.get('/test/ping/status_repository', pingController.pingStatusRepository.bind(pingController));
    app.get('/test/ping/digest_notifier', pingController.pingDigestNotifier.bind(pingController));
    app.get('/healthz', pingController.healthz.bind(pingController));

    return {
      ping: pingController,
      monitor: monitorController,
    };
  }

  /**
   * Listen.
   * @private
   * @param {express.Application} app Express app.
   */
  async listen(app: any): Promise<void> {
    return new Promise((resolve) => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      app.listen(port, hostname, () => {
        global.log.save('server-listening-started', `Server listening started at "http://${hostname}:${port}".`);
        resolve();
      });
    });
  }
}
