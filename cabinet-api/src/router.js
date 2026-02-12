const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const proxy = require('express-http-proxy');

const AppIdentHeaders = require('./lib/app_ident_headers');
const AppInfo = require('./lib/app_info');
const { asyncLocalStorageMiddleware, getTraceId } = require('./lib/async_local_storage');
const AuthController = require('./controllers/auth');
const TestController = require('./controllers/test');

// Constants.
const NULL_OBJECT_BASE64 = 'bnVsbA=='; // NULL-object string (`null`) as base64 equals `bnVsbA==`.
const USER_DATA_HEADER = 'User-Data';
const ALLOW_TOKENS_HEADER = 'Allow-Tokens';

/**
 * Router.
 */
class Router {
  /**
   * Route service constructor.
   */
  constructor() {
    // Singleton.
    if (!Router.singleton) {
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

    // Enable response compression support.
    app.use(compression());

    // Log requests.
    app.use(this.logRouter.bind(this));

    // Allow CORS.
    app.use(
      cors({
        origin: '*',
        methods: 'GET, POST, PUT, DELETE, OPTIONS',
        allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, token, Authorization, debug-user-id, enabled-mocks',
        exposedHeaders: 'Name, Version, Customer, Environment, returned-mocks, external-reader-errors',
      }),
    );

    // Init routes.
    this.controllers = this.initRoutes(app);

    // Start listening.
    await this.listen(app);
  }

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   * @returns {object} Controllers.
   */
  initRoutes(app) {
    // Init controllers.
    const authController = new AuthController();
    const testController = new TestController();
    const appInfo = new AppInfo();
    authController.initRoutes(app);

    // Test controller.
    app.get(
      '/test/ping',
      bodyParser.json({ limit: global.config.server.maxBodySize }),
      AppIdentHeaders.middleware,
      testController.ping.bind(testController),
    );

    // Proxy to custom APIs.
    const { customApis = [] } = global.config.discovery;
    for (const customApi of customApis) {
      // Define custom API params.
      const {
        apiName,
        proxyTo,
        authHeader,
        sendUserData = false,
        isCheckJwtOnly = false, // Check user JWT without sending user auth data (from ID) to custom API. TTL - 24h.
        headers,
        allowedUnits = [],
        allowedPaths,
      } = customApi;
      const route = `/custom/${apiName}`;

      // Init proxy.
      app.use(
        route,
        (req, res, next) => {
          log.save('proxy-to', { proxyTo, route });
          next();
        },
        sendUserData || isCheckJwtOnly ? authController.getAuthMiddleware({ isCheckJwtOnly }) : (req, res, next) => next(),
        authController.getCheckUserInOneOfUnits(allowedUnits),
        proxy(proxyTo, {
          // Define request decorator.
          proxyReqOptDecorator: function (proxyReqOpts, req) {
            return new Promise(function (resolve, reject) {
              // Check allowed paths.
              if (allowedPaths && allowedPaths.length > 0) {
                // Define params.
                const {
                  method: reqMethod,
                  path: reqPath,
                  headers: { authorization: reqAuthorizationHeader },
                } = proxyReqOpts;

                // Check access.
                if (
                  !allowedPaths.find(({ method, path, authorizationHeader }) => {
                    return reqMethod === method && reqPath === path && reqAuthorizationHeader === authorizationHeader;
                  })
                ) {
                  return reject('Not allowed');
                }
              }

              // Set header.
              if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                  proxyReqOpts.headers[key] = value;
                }
              }

              // TODO Replace it by Set headers
              // Set auth header.
              if (authHeader) {
                proxyReqOpts.headers['Authorization'] = authHeader;
              }

              // Prevent manually setting User Data.
              proxyReqOpts.headers[USER_DATA_HEADER] = NULL_OBJECT_BASE64;

              // Set User Data.
              if (sendUserData && req.authUserInfo && req.authUserUnits) {
                const { userId, email, provider, phone, ipn, edrpou, firstName, lastName, middleName, companyName } = req.authUserInfo;
                const userInfo = JSON.stringify({
                  userId,
                  email,
                  provider,
                  phone,
                  ipn,
                  edrpou,
                  firstName,
                  lastName,
                  middleName,
                  separatedAuthUserUnits: req.separatedAuthUserUnits,
                  authUserUnits: req.authUserUnits,
                  companyName,
                });
                proxyReqOpts.headers[USER_DATA_HEADER] = Buffer.from(userInfo, 'utf8').toString('base64');

                const allowTokens = []
                  .concat(...req.authUserUnitEntities.all.map(({ allowTokens }) => allowTokens))
                  .filter(Boolean)
                  .filter((token, index, self) => self.indexOf(token) === index);

                proxyReqOpts.headers[ALLOW_TOKENS_HEADER] = Buffer.from(JSON.stringify(allowTokens), 'utf8').toString('base64');
              }

              proxyReqOpts.headers['x-trace-id'] = getTraceId();
              proxyReqOpts.headers['x-trace-service'] = appInfo.name;

              // Resolve decorated options.
              resolve(proxyReqOpts);
            });
          },
        }),
      );
    }

    // Proxy other requests to main proxy.
    if (global.config.discovery.mainProxy) {
      app.use(
        proxy(global.config.discovery.mainProxy, {
          limit: global.config.server.maxBodySize,
          filter: async (req) => {
            log.save('proxy-to', { route: req.originalUrl, method: req.method });
            return true;
          },
          proxyReqOptDecorator: function (proxyReqOpts) {
            proxyReqOpts.headers['x-trace-id'] = getTraceId();
            proxyReqOpts.headers['x-trace-service'] = appInfo.name;
            return proxyReqOpts;
          },
          proxyErrorHandler: (err, res, next) => {
            log.save(
              'proxy-error',
              { error: { message: err.message, stack: err.stack }, route: res.req.originalUrl, method: res.req.method },
              'error',
            );
            res.status(500).json({ error: { message: 'Proxy error' } });
            next();
          },
        }),
      );
    }

    // Handle errors.
    app.use(this.jsonErrorHandler);

    return {
      ping: testController,
      auth: authController,
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
      const { hostname, port } = global.config.server;
      app.listen(port, hostname, () => {
        global.log.save('api-listening-started', { url: `http://${hostname}:${port}` });
        resolve();
      });
    });
  }

  /**
   * Log router.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @param {function} next Next handler.
   */
  async logRouter(req, res, next) {
    // Define params.
    const method = req && req.method;
    const headers = req && req.headers;
    const url = req && req.url;
    const remoteAddress = req.connection.remoteAddress;
    const xForwardedFor = req.headers['x-forwarded-for'] || null;
    const userIp = { remoteAddress, xForwardedFor };
    const userAgent = req.headers['user-agent'] || null;

    // Save.
    global.log.save('http-request', { url, method, headers, userAgent, userIp });

    this.attachResponseLogger(req, res);

    // Go next.
    next();
  }

  jsonErrorHandler(err, req, res, _next) {
    global.log.save('proxy-error', err);

    let status = 500;
    let message = err.message || 'Internal server error';

    // Handle HTTP errors.
    if (err.status) {
      status = err.status;

      // Handle proxy connection errors.
    } else if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(err.code)) {
      status = 503;
      message = 'Service unavailable';
    }

    res.status(status);
    res.json({ error: { message } });
  }

  /**
   * Attach logger to response handling.
   * @private
   * @param {object} res Express response object.
   */
  attachResponseLogger(req, res) {
    const time = Date.now();

    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    let responseLogged = false;

    const logResponse = (body) => {
      if (!responseLogged) {
        global.log.save('http-response', {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseSize: body ? body.length : 0,
          responseTime: Date.now() - time,
        });
        responseLogged = true;
      }
    };

    res.send = (body) => {
      logResponse(body);
      originalSend.call(res, body);
    };

    res.end = (body) => {
      logResponse(body);
      originalEnd.call(res, body);
    };

    res.json = (body) => {
      logResponse(body);
      originalJson.call(res, body);
    };
  }
}

module.exports = Router;
