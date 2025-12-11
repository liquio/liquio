const express = require('express');

const PingController = require('../controllers/ping');
const MonitorController = require('../controllers/monitor');
const AppIdentHeaders = require('../lib/app_ident_headers');
const Cors = require('../lib/cors');
const { asyncLocalStorageMiddleware } = require('../lib/async_local_storage');

/**
 * Router service.
 */
class RouterService {
  /**
   * Route service constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
    app.use(log.logRouter.bind(log));

    // App info in headers.
    AppIdentHeaders.add(app, config);

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
  initRoutes(app) {
    const pingController = new PingController(this.config);
    const monitorController = new MonitorController(this.config);

    app.get('/test/ping', pingController.ping.bind(pingController));
    app.get('/monitors/system', monitorController.system.bind(monitorController));

    // Healthz controller.
    app.get('/healthz', pingController.healthz.bind(pingController));

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
  async listen(app) {
    return new Promise((resolve) => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      app.listen(port, hostname, () => {
        log.save('server-listening-started', { url: `http://${hostname}:${port}` });
        resolve();
      });
    });
  }
}

module.exports = RouterService;
