const restify = require('restify');
const plugins = require('restify-plugins');
const CookieParser = require('restify-cookies');

const { asyncLocalStorageMiddleware } = require('./lib/async_local_storage');

let { env } = global;

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

if (env == 'localhost') {
  server.pre(restify.CORS());
  server.pre(restify.fullResponse());

  function unknownMethodHandler(req, res) {
    if (req.method.toLowerCase() === 'options') {
      const allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With', 'Authorization']; // added Origin & X-Requested-With & **Authorization**

      if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
      res.header('Access-Control-Allow-Methods', res.methods.join(', '));
      res.header('Access-Control-Allow-Origin', req.headers.origin);

      return res.send(200);
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
