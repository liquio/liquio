/**
 * CORS.
 */
class Cors {
  /**
   * Allow.
   * @param {object} app Express app instance.
   */
  static allow(app) {
    const {
      allowOrigin = '*',
      allowHeaders = 'Origin, X-Requested-With, Content-Type, Accept, token, Authorization, debug-user-id, enabled-mocks',
      exposeHeaders = 'Name, Version, Customer, Environment, returned-mocks, external-reader-errors',
      allowMethods = 'GET, POST, PUT, DELETE, OPTIONS'
    } = global.config.cors;
    app.use(function (req, res, next) {
      res.header('Access-Control-Allow-Origin', allowOrigin);
      res.header('Access-Control-Allow-Headers', allowHeaders);
      res.header('Access-Control-Expose-Headers', exposeHeaders);
      res.header('Access-Control-Allow-Methods', allowMethods);
      next();
    });
  }
}

module.exports = Cors;
