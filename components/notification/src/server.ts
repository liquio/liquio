import express from 'express';
import cookieParser from 'cookie-parser';

import { asyncLocalStorageMiddleware } from './lib/async_local_storage';
import {
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  corsValidationMiddleware,
  responseEncodingMiddleware,
} from './middleware/security';
import { AppIdentHeaders } from './lib/app_ident_headers';

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

const app = express();

app.use(asyncLocalStorageMiddleware);

// Log all requests. Wraps res.send/res.end/res.json - must run before responseEncodingMiddleware
// wraps res.send again below, so that the restify-compat shim ends up as the outer wrapper that
// every controller's res.send([code], body) call actually hits.
app.use(global.log.logRouter.bind(global.log));

// Security middleware - applied before routes
app.use(securityHeadersMiddleware());
app.use(responseEncodingMiddleware());
app.use(inputSanitizationMiddleware());

AppIdentHeaders.add(app);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware with configuration. The `cors` package answers OPTIONS preflight requests
// with 204 itself, which is what restify's server.on('MethodNotAllowed', ...) localhost-only
// handler (removed here) was manually working around.
app.use(corsValidationMiddleware(corsConfig));

// Static admin UI assets (src/admin/static/**). express.static falls through to the next
// handler (the controllers below) when a path doesn't match a file on disk.
app.use(express.static((global as any).adminStaticDir));

const lists = new Lists(app);
const message = new Message(app);
const template = new Template(app);
const staticRoutes = new StaticRoutes(app);
const queue = new Queue(app);
const configsController = new ConfigsController(app);
const testController = new TestController(app);

app.locals.controllers = {
  lists,
  message,
  template,
  staticRoutes,
  queue,
  configsController,
  test: testController,
};

// Not found.
app.use((req: any, res: any) => {
  res.status(404).send({ code: 'ResourceNotFound', message: `${req.url} does not exist` });
});

// Global error handler for uncaught errors.
app.use((err: any, req: any, res: any, _next: any) => {
  global.log.save('server-uncaught-exception', {
    error: err?.message,
    stack: err?.stack,
    method: req?.method,
    url: req?.url,
  }, 'error');
  res.status(err?.statusCode || 500).send({ error: 'Internal server error' });
});

// Handle unhandled promise rejections.
process.on('unhandledRejection', (reason: any, _promise) => {
  global.log.save('unhandled-rejection', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
  }, 'error');
});

export { app as server };
