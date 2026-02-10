const restify = require('restify');
const plugins = require('restify-plugins');
const CookieParser = require('restify-cookies');

const { asyncLocalStorageMiddleware } = require('./lib/async_local_storage');
const {
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  corsValidationMiddleware,
  responseEncodingMiddleware,
} = require('./middleware/security');

let { env } = global;

// CORS configuration from global.conf
const corsConfig = {
  allowedOrigins: global.conf?.cors?.allowedOrigins || (env === 'localhost' 
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080']
    : ['http://localhost:3000', 'http://localhost:3001']),
};

const server = restify.createServer({
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

let Lists = require('./controllers/ListsAndTransports');
let Message = require('./controllers/message');
let Template = require('./controllers/templates');
let StaticRoutes = require('./controllers/staticRoutes');
let Queue = require('./controllers/queue');
let ConfigsController = require('./controllers/configAPIContoller');
let TestController = require('./controllers/test');
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
  function unknownMethodHandler(req, res) {
    if (req.method.toLowerCase() === 'options') {
      return res.send(204);
    } else {
      return res.send(new restify.MethodNotAllowedError());
    }
  }

  server.on('MethodNotAllowed', unknownMethodHandler);
}

server.get(
  /static\/.*/,
  restify.serveStatic({
    directory: global.adminStaticDir,
  }),
);

module.exports = server;
