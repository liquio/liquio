const AppInfo = require('./app_info');

// Constants.
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

/**
 * App ident version.
 */
class AppIdentHeaders {
  /**
   * Add.
   * @param {object} app Express app instance.
   */
  static add(app) {
    // Defoine app info.
    const appInfo = new AppInfo();
    const customer = (config && config.server && config.server.customer) || DEFAULT_CUSTOMER;
    const environment = (config && config.server && config.server.environment) || DEFAULT_ENVIRONMENT;

    // Set headers.
    app.use(function (req, res, next) {
      res.setHeader('Name', appInfo.name);
      res.setHeader('Version', appInfo.version);
      res.setHeader('Customer', customer);
      res.setHeader('Environment', environment);
      next();
    });
  }
}

module.exports = AppIdentHeaders;
