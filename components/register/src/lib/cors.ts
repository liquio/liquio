import { Application } from 'express';

/**
 * CORS.
 */
export default class Cors {
  /**
   * Allow.
   * @param {object} app Express app instance.
   */
  static allow(app: Application): void {
    app.use(function (req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, token');
      res.header('Access-Control-Expose-Headers', 'Name, Version');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      next();
    });
  }
}
