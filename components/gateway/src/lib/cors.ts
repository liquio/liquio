/**
 * CORS.
 */
export class Cors {
  /**
   * Allow.
   * @param {object} app Express app instance.
   */
  static allow(app: any) {
    app.use(function (req: any, res: any, next: any) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, token, Authorization');
      res.header('Access-Control-Expose-Headers', 'Name, Version, Customer, Environment');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      next();
    });
  }
}
