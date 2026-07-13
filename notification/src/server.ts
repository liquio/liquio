import restify from 'restify';
import plugins from 'restify-plugins';
import CookieParser from 'restify-cookies';

import { asyncLocalStorageMiddleware } from './lib/async_local_storage';
import {
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  corsValidationMiddleware,
  responseEncodingMiddleware,
} from './middleware/security';

import { Lists } from './controllers/ListsAndTransports';
import { Message } from './controllers/message';
import { Template } from './controllers/templates';
import { StaticRoutes } from './controllers/staticRoutes';
import { Queue } from './controllers/queue';
import { ConfigsController } from './controllers/configAPIContoller';
import { TestController } from './controllers/test';

const { env } = global as any;

// CORS configuration from global.conf
const corsConfig = {
  allowedOrigins: (global as any).conf?.cors?.allowedOrigins || (env === 'localhost'
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080']
    : ['http://localhost:3000', 'http://localhost:3001']),
};

const server: any = restify.createServer({
  name: 'notification',
  version: '1.0.0',
});

server.pre(restify.pre.sanitizePath());
server.use(plugins.acceptParser(server.acceptable));
server.use(plugins.queryParser());
server.use(plugins.bodyParser());
server.use(CookieParser.parse);

server.pre(asyncLocalStorageMiddleware);

// Security middleware - applied before routes
server.use(securityHeadersMiddleware());
server.use(responseEncodingMiddleware());
server.use(inputSanitizationMiddleware());

// Log all requests.
server.pre(global.log.logRouter.bind(global.log));

new Lists(server);
new Message(server);
new Template(server);
new StaticRoutes(server);
new Queue(server);
new ConfigsController(server);
const testController = new TestController(server);

server.controllers = {
  test: testController,
};

// CORS middleware with configuration
server.use(corsValidationMiddleware(corsConfig));
server.pre(restify.fullResponse());

// Handle OPTIONS requests for localhost development
if (env === 'localhost') {
  const unknownMethodHandler = (req: any, res: any) => {
    if (req.method.toLowerCase() === 'options') {
      return res.send(204);
    } else {
      return res.send(new restify.MethodNotAllowedError());
    }
  };

  server.on('MethodNotAllowed', unknownMethodHandler);
}

// Global error handler for uncaught errors
server.on('uncaughtException', (req: any, res: any, route: any, err: any) => {
  global.log.save('server-uncaught-exception', {
    error: err?.message,
    stack: err?.stack,
    route: route?.path,
    method: req?.method,
    url: req?.url,
  }, 'error');
  res.send(500, { error: 'Internal server error' });
});

// Error handler middleware
server.on('error', (err: any) => {
  global.log.save('server-error-event', {
    error: err?.message,
    stack: err?.stack,
  }, 'error');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, _promise) => {
  global.log.save('unhandled-rejection', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
  }, 'error');
});

server.get(
  /static\/.*/,
  restify.serveStatic({
    directory: (global as any).adminStaticDir,
  }),
);

export { server };
