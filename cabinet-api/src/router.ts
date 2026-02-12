import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import proxy from 'express-http-proxy';

import AppIdentHeaders from './lib/app_ident_headers';
import AppInfo from './lib/app_info';
import { asyncLocalStorageMiddleware, getTraceId } from './lib/async_local_storage';
import AuthController from './controllers/auth';
import TestController from './controllers/test';

// Constants.
const NULL_OBJECT_BASE64 = 'bnVsbA=='; // NULL-object string (`null`) as base64 equals `bnVsbA==`.
const USER_DATA_HEADER = 'User-Data';
const ALLOW_TOKENS_HEADER = 'Allow-Tokens';

/**
 * Router.
 */
class Router {
  private static singleton: Router;

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
  async init(): Promise<void> {
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
      })
    );

    // Init routes.
    this.controllers = this.initRoutes(app);

    // Start listening.
    await this.listen(app);
  }

  private controllers: any;

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   * @returns {object} Controllers.
   */
  initRoutes(app: Express): { ping: TestController; auth: AuthController } {
    // Init controllers.
    const authController = new AuthController();
    const testController = new TestController();
    const appInfo = new AppInfo();
    authController.initRoutes(app);

    // Test controller.
    app.get(
      '/test/ping',
      bodyParser.json({ limit: (global.config as any).server.maxBodySize }),
      AppIdentHeaders.middleware,
      testController.ping.bind(testController)
    );

    // Proxy to custom APIs.
    const { customApis = [] } = (global.config as any).discovery;
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
        (req: Request, _res: Response, next: NextFunction) => {
          (global.log as any).save('proxy-to', { proxyTo, route });
          next();
        },
        sendUserData || isCheckJwtOnly
          ? authController.getAuthMiddleware({ isCheckJwtOnly })
          : (req: Request, _res: Response, next: NextFunction) => next(),
        authController.getCheckUserInOneOfUnits(allowedUnits),
        proxy(proxyTo, {
          // Define request decorator.
          proxyReqOptDecorator: function (proxyReqOpts: any, req: Request) {
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
                  !allowedPaths.find(
                    ({
                      method,
                      path,
                      authorizationHeader,
                    }: {
                      method: string;
                      path: string;
                      authorizationHeader: string;
                    }) => {
                      return (
                        reqMethod === method &&
                        reqPath === path &&
                        reqAuthorizationHeader === authorizationHeader
                      );
                    }
                  )
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
              if (sendUserData && (req as any).authUserInfo && (req as any).authUserUnits) {
                const {
                  userId,
                  email,
                  provider,
                  phone,
                  ipn,
                  edrpou,
                  firstName,
                  lastName,
                  middleName,
                  companyName,
                } = (req as any).authUserInfo;
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
                  separatedAuthUserUnits: (req as any).separatedAuthUserUnits,
                  authUserUnits: (req as any).authUserUnits,
                  companyName,
                });
                proxyReqOpts.headers[USER_DATA_HEADER] = Buffer.from(userInfo, 'utf8').toString(
                  'base64'
                );

                const allowTokens = []
                  .concat(...(req as any).authUserUnitEntities.all.map(({ allowTokens }: any) => allowTokens))
                  .filter(Boolean)
                  .filter((token: string, index: number, self: string[]) => self.indexOf(token) === index);

                proxyReqOpts.headers[ALLOW_TOKENS_HEADER] = Buffer.from(
                  JSON.stringify(allowTokens),
                  'utf8'
                ).toString('base64');
              }

              proxyReqOpts.headers['x-trace-id'] = getTraceId();
              proxyReqOpts.headers['x-trace-service'] = appInfo.name;

              // Resolve decorated options.
              resolve(proxyReqOpts);
            });
          },
        })
      );
    }

    // Proxy other requests to main proxy.
    if ((global.config as any).discovery.mainProxy) {
      app.use(
        proxy((global.config as any).discovery.mainProxy, {
          limit: (global.config as any).server.maxBodySize,
          filter: async (req: Request) => {
            (global.log as any).save('proxy-to', { route: req.originalUrl, method: req.method });
            return true;
          },
          proxyReqOptDecorator: function (proxyReqOpts: any) {
            proxyReqOpts.headers['x-trace-id'] = getTraceId();
            proxyReqOpts.headers['x-trace-service'] = appInfo.name;
            return proxyReqOpts;
          },
          proxyErrorHandler: (err: Error, res: any, next: NextFunction) => {
            (global.log as any).save(
              'proxy-error',
              { error: { message: err.message, stack: err.stack }, route: res.req.originalUrl, method: res.req.method },
              'error'
            );
            res.status(500).json({ error: { message: 'Proxy error' } });
            next();
          },
        })
      );
    }

    // Handle errors.
    app.use(this.jsonErrorHandler.bind(this));

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
  private async listen(app: Express): Promise<void> {
    return new Promise((resolve) => {
      // Start server listening.
      const { hostname, port } = (global.config as any).server;
      app.listen(port, hostname, () => {
        (global.log as any).save('api-listening-started', { url: `http://${hostname}:${port}` });
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
  private async logRouter(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Define params.
    const method = req && req.method;
    const headers = req && req.headers;
    const url = req && req.url;
    const remoteAddress = (req.connection as any).remoteAddress;
    const xForwardedFor = req.headers['x-forwarded-for'] || null;
    const userIp = { remoteAddress, xForwardedFor };
    const userAgent = req.headers['user-agent'] || null;

    // Save.
    (global.log as any).save('http-request', { url, method, headers, userAgent, userIp });

    this.attachResponseLogger(req, res);

    // Go next.
    next();
  }

  private jsonErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    (global.log as any).save('proxy-error', err);

    let status = 500;
    let message = err.message || 'Internal server error';

    // Handle HTTP errors.
    if ((err as any).status) {
      status = (err as any).status;

      // Handle proxy connection errors.
    } else if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes((err as any).code)) {
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
  private attachResponseLogger(req: Request, res: Response): void {
    const time = Date.now();

    const originalSend = res.send;
    const originalEnd = res.end;
    const originalJson = res.json;
    let responseLogged = false;

    const logResponse = (body: any) => {
      if (!responseLogged) {
        (global.log as any).save('http-response', {
          requestId: (req as any).requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseSize: body ? body.length : 0,
          responseTime: Date.now() - time,
        });
        responseLogged = true;
      }
    };

    res.send = (body: any) => {
      logResponse(body);
      return originalSend.call(res, body);
    };

    res.end = (...args: any[]) => {
      logResponse(args[0]);
      return originalEnd.apply(res, args);
    };

    res.json = (body: any) => {
      logResponse(body);
      return originalJson.call(res, body);
    };
  }
}

export default Router;
