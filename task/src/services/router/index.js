const express = require('express');
const cors = require('cors');

const AppIdentHeaders = require('../../lib/app_ident_headers');
const HttpRequest = require('../../lib/http_request');
const Controllers = require('../../controllers');
const Validators = require('../../validators');
const { routes } = require('./routes');
const { asyncLocalStorageMiddleware } = require('../../lib/async_local_storage');
const typeOf = require('../../lib/type_of');

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
      this.controllers = {};
      this.validators = {};
      this.server = null;
      RouterService.singleton = this;
    }

    // Return singleton.
    return RouterService.singleton;
  }

  /**
   * Controllers classes list.
   */
  static get ControllersList() {
    return Controllers.List;
  }

  /**
   * Init.
   * @param {object} [options]
   * @param {object} [options.customControllers] Custom controllers as { someControllerName: SomeControllerClass, anotherControllerName: AnotherControllerClass }.
   * @param {object} [options.customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @param {object} [options.customRoutes] Custom routes as { 'GET /some_url': { middlewares: [{ name: 'someMiddleware', method: 'someMiddlewareMethod' }], controller: { name: 'someController', method: 'someControllerMethod' } } }.
   */
  async init(options = {}) {
    // Define params.
    const { customControllers, customValidators, customRoutes } = options;

    // Init Express app.
    const app = express();

    // Tracing.
    app.use(asyncLocalStorageMiddleware);

    // Save request info to log.
    app.use(log.logRouter.bind(log));

    // App info in headers.
    AppIdentHeaders.add(app, config);

    // Allow CORS.
    app.use(cors({
      origin: '*',
      methods: 'GET, POST, PUT, DELETE, OPTIONS',
      allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, token, Authorization, debug-user-id, enabled-mocks',
      exposedHeaders: 'Name, Version, Customer, Environment, returned-mocks, external-reader-errors'
    }));

    // Init routes.
    this.initRoutes(app, customControllers, customValidators, customRoutes);

    this.express = app;
  }

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   * @param {object} [customControllers] Custom controllers as { someControllerName: SomeControllerClass, anotherControllerName: AnotherControllerClass }.
   * @param {object} [customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @param {object} [customRoutes] Custom routes as { 'GET /some_url': { middlewares: [{ name: 'someMiddleware', method: 'someMiddlewareMethod' }], controller: { name: 'someController', method: 'someControllerMethod' } } }.
   */
  initRoutes(app, customControllers = {}, customValidators = {}, customRoutes = {}) {
    // Define JSON body parser.
    const maxBodySize = this.config.server.maxBodySize;
    const rawBody = HttpRequest.getRawBody(maxBodySize);
    const jsonBodyParser = HttpRequest.getJsonBodyParser(maxBodySize);
    const urlencodedBodyParser = HttpRequest.getUrlencodedBodyParser();
    const formDataBodyParser = HttpRequest.getFormDataBodyParser();
    const formDataBodyParserInMemory = HttpRequest.getFormDataBodyParserInMemory();
    const xmlBodyParser = HttpRequest.getXmlBodyParser();

    // Init controllers.
    this.controllers = new Controllers(this.config, customControllers);
    this.validators = new Validators(this.config, customValidators);

    // Define all routes.
    const allRoutes = {
      ...routes,
      ...customRoutes
    };

    // Handle all routes.
    for (const routeKey in allRoutes) {
      // Define params.
      const [requestMethod, requestUrl] = routeKey.split(' ');
      const routeDescription = allRoutes[routeKey];
      const disableBodyParserDescription = !!routeDescription.disableBodyParser;
      const rawBodyDescription = !!routeDescription.rawBody;
      const urlencodedBodyParserDescription = !!routeDescription.urlencodedBodyParser;
      const formDataBodyParserDescription = !!routeDescription.formDataBodyParser;
      const formDataBodyParserInMemoryDescription = !!routeDescription.formDataBodyParserInMemory;
      const jsonBodyParserDescription = !!routeDescription.jsonBodyParser;
      const xmlBodyParserDescription = !!routeDescription.xmlBodyParser;
      const validatorDescription = routeDescription.validator;
      const middlewaresDescription = routeDescription.middlewares;
      const controllerDescription = routeDescription.controller;
      const authDescription = routeDescription.auth;
      const groupDescription = routeDescription.groups;
      const basicAuthDescription = routeDescription.basicAuth;
      const protectedBasicAuth = routeDescription.protectedBasicAuth;
      const basicOrBearerAuthDescription = routeDescription.bearerAuth;
      const externalIdHeaderAuthName = routeDescription.externalIdHeaderAuth;

      // Init all handlers.
      const auth = authDescription
        ? this.controllers.auth.getCheckMiddleware(authDescription, groupDescription)
        : (res, req, next) => next();

      let predefineRouteBodyParser;
      switch (true) {
        case disableBodyParserDescription:
          predefineRouteBodyParser = (res, req, next) => next();
          break;
        case rawBodyDescription:
          predefineRouteBodyParser = rawBody;
          break;
        case urlencodedBodyParserDescription:
          predefineRouteBodyParser = urlencodedBodyParser;
          break;
        case formDataBodyParserDescription:
          predefineRouteBodyParser = formDataBodyParser;
          break;
        case formDataBodyParserInMemoryDescription:
          predefineRouteBodyParser = formDataBodyParserInMemory(routeDescription.formDataBodyParserInMemory);
          break;
        case jsonBodyParserDescription:
          predefineRouteBodyParser = jsonBodyParser;
          break;
        case xmlBodyParserDescription:
          predefineRouteBodyParser = xmlBodyParser;
          break;
        default:
          predefineRouteBodyParser = jsonBodyParser;
      }
      const routeBodyParser = predefineRouteBodyParser;

      const catchAsync = fn => {
        return (req, res, next) => {
          if (typeof fn !== 'function') {
            return res.status(500).send({
              error: {
                message: 'Controller for route not defined. Check router configuration.',
                code: 500
              }
            });
          }
          fn(req, res, next).catch(next);
        };
      };
      const basicOrBearerAuth = (basicAuthDescription || basicOrBearerAuthDescription)
        ? this.controllers.auth.basicOrBearerAuth.bind(this.controllers.auth)
        : (res, req, next) => next();

      const checkProtectedBasicAuth = (basicAuthDescription && protectedBasicAuth)
        ? this.controllers.auth.checkProtectedBasicAuth.bind(this.controllers.auth)
        : (res, req, next) => next();

      const externalIdHeaderAuth = typeOf(externalIdHeaderAuthName) === 'string'
        ? this.controllers.auth.externalIdHeaderAuth.bind(this.controllers.auth)
        : () => (res, req, next) => next();

      const middlewares = middlewaresDescription.map(v => this.controllers.getHandler(v.name, v.method));
      const controller = this.controllers.getHandler(controllerDescription.name, controllerDescription.method, controllerDescription.methodHandler);
      const validator =
        (validatorDescription && this.validators.getHandler(validatorDescription.name, validatorDescription.method)) || ((res, req, next) => next());

      const handlers = [
        externalIdHeaderAuth(externalIdHeaderAuthName), // !!Check External ID from HTTP Header before body parsing. Due to possible DDOS via large files (we need to temporary store them in memory for EDS checking).
        routeBodyParser,
        asyncLocalStorageMiddleware,
        basicOrBearerAuth,
        checkProtectedBasicAuth,
        auth,
        validator,
        this.validators.getValidationResultHandler(),
        ...middlewares,
        catchAsync(controller)
      ];

      // Define route.
      app[requestMethod.toLowerCase()](requestUrl, ...handlers);
    }

    app.all(/.*/, (_req, res, _next) => {
      res.status(404).send({
        error: {
          message: 'Page not found.',
          code: 404
        }
      });
    });

    // Error handler middleware.
    app.use((error, _req, res, _next) => {
      res.status(error.status || error.httpStatusCode || 500).send({
        error: {
          message: error.message || 'Internal Server Error.',
          code: error.status || error.httpStatusCode || 500
        }
      });
    });
  }

  /**
   * Listen.
   * @private
   * @param {object} app Express app.
   */
  async listen() {
    return new Promise(resolve => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      this.server = this.express.listen(port, hostname, () => {
        log.save('server-listening-started', { url: `http://${hostname}:${port}` });
        resolve();
      });
    });
  }

  async stop() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          log.save('server-listening-stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export.
module.exports = RouterService;
