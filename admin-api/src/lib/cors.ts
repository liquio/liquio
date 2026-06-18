/**
 * CORS.
 */
class Cors {
  /**
   * Allow.
   * @param {object} app Express app instance.
   */
  static allow(app) {
    app.use(function (req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, token, Authorization, debug-user-id, Last-Workflow-History-Id',
      );
      res.header('Access-Control-Expose-Headers', 'Name, Version, Last-Workflow-History-Id', 'x-custom-lang');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      next();
    });
  }
}

module.exports = Cors;
