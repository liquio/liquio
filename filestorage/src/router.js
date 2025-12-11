const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

const Cors = require('./lib/cors');
const AppIdentHeaders = require('./lib/app_ident_headers');
const HttpRequest = require('./lib/http_request');
const Controllers = require('./controllers');
const swaggerDocument = require('../swagger.json');
const { asyncLocalStorageMiddleware } = require('./lib/async_local_storage');

/**
 * Router.
 */
class Router {
  /**
   * Route service constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!Router.singleton) {
      // Define params.
      this.config = config;
      this.controllers = {};

      // Init singleton.
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

    app.use(asyncLocalStorageMiddleware);

    // Save request info to log.
    app.use(log.logRouter.bind(log));

    // App info in headers.
    AppIdentHeaders.add(app, this.config);

    // Allow CORS.
    Cors.allow(app);

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
    const getHandler = this.controllers.getHandler.bind(this.controllers);

    // Files controller - before body parsing.
    app.post('/files', getHandler('auth', 'basicAuth'), getHandler('files', 'upload'));
    app.post('/files/uploadArchive', getHandler('auth', 'basicAuth'), getHandler('files', 'uploadArchive'));

    // Parse body.
    const maxBodySize = this.config.server.maxBodySize;
    HttpRequest.parseBodyJson(app, maxBodySize);

    // Test controller.
    app.get('/test/ping', getHandler('test', 'ping'));
    app.get('/test/ping_with_auth', getHandler('auth', 'basicAuth'), getHandler('test', 'ping'));
    app.get('/test/file_provider', getHandler('test', 'checkOpenstackProvider'));

    // Containers controller.
    app.get('/containers', getHandler('auth', 'basicAuth'), getHandler('containers', 'getAll'));
    app.get('/containers/:id', getHandler('auth', 'basicAuth'), getHandler('containers', 'findById'));
    app.post('/containers', getHandler('auth', 'basicAuth'), getHandler('containers', 'create'));
    app.put('/containers/:id', getHandler('auth', 'basicAuth'), getHandler('containers', 'update'));
    app.delete('/containers/:id', getHandler('auth', 'basicAuth'), getHandler('containers', 'delete'));

    // Files controller.
    app.get('/files', getHandler('auth', 'basicAuth'), getHandler('files', 'getAll'));
    app.get('/files/:id/info', getHandler('auth', 'basicAuth'), getHandler('files', 'findInfoById'));
    app.get('/files/:id', getHandler('auth', 'basicAuth'), getHandler('files', 'download'));
    app.get('/files/:id/preview', getHandler('auth', 'basicAuth'), getHandler('files', 'downloadPreview'));
    app.get('/files/:ids/zip', getHandler('auth', 'basicAuth'), getHandler('files', 'downloadZip'));
    app.get('/files/:id/p7s', getHandler('auth', 'basicAuth'), getHandler('files', 'getP7sSignatureByFileId'));
    app.put('/files/:id', getHandler('auth', 'basicAuth'), getHandler('files', 'update'));
    app.delete('/files/:id', getHandler('auth', 'basicAuth'), getHandler('files', 'delete'));
    app.post('/files/:id/copy', getHandler('auth', 'basicAuth'), getHandler('files', 'copy'));
    app.post('/files/asicmanifest', getHandler('auth', 'basicAuth'), getHandler('files', 'createAsicManifest'));
    app.post('/files/asic', getHandler('auth', 'basicAuth'), getHandler('files', 'createAsice'));
    app.post('/files/asice', getHandler('auth', 'basicAuth'), getHandler('files', 'createAsice'));
    app.post('/files/asics', getHandler('auth', 'basicAuth'), getHandler('files', 'createAsics'));
    app.head('/files/:ids/p7s_metadata', getHandler('auth', 'basicAuth'), getHandler('files', 'getFileIdsWithP7s'));

    // Signatures controller.
    app.get('/signatures', getHandler('auth', 'basicAuth'), getHandler('signatures', 'getAll'));
    app.get('/signatures/:id', getHandler('auth', 'basicAuth'), getHandler('signatures', 'findById'));
    app.post('/signatures', getHandler('auth', 'basicAuth'), getHandler('signatures', 'create'));
    app.put('/signatures/:id', getHandler('auth', 'basicAuth'), getHandler('signatures', 'update'));
    app.delete('/signatures/:id', getHandler('auth', 'basicAuth'), getHandler('signatures', 'delete'));
    app.delete('/signatures/file/:fileId', getHandler('auth', 'basicAuth'), getHandler('signatures', 'deleteByFileId'));

    // P7S signatures controller.
    app.get('/p7s_signatures/:fileId/info', getHandler('auth', 'basicAuth'), getHandler('p7sSignatures', 'findInfoByFileId'));
    app.get('/p7s_signatures/:id', getHandler('auth', 'basicAuth'), getHandler('p7sSignatures', 'findById'));
    app.post('/p7s_signatures', getHandler('auth', 'basicAuth'), getHandler('p7sSignatures', 'create'));
    app.put('/p7s_signatures/:id', getHandler('auth', 'basicAuth'), getHandler('p7sSignatures', 'update'));
    app.delete('/p7s_signatures/:id', getHandler('auth', 'basicAuth'), getHandler('p7sSignatures', 'delete'));
    app.delete('/p7s_signatures/file/:fileId', getHandler('auth', 'basicAuth'), getHandler('p7sSignatures', 'deleteByFileId'));

    // Swagger.
    if (this.config.admin.swagger) {
      app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }

    // Show static.
    app.use(express.static(path.join(__dirname, 'static')));
  }

  /**
   * Listen.
   * @private
   * @param {object} app Express app.
   */
  async listen(app) {
    return new Promise((resolve) => {
      // Start server listening.
      const { hostname, port } = this.config.server;
      app.listen(port, hostname, () => {
        log.save('server-listening-started', { url: `http://${hostname}:${port}` });
        resolve();
      });
    });
  }
}

// Export.
module.exports = Router;
