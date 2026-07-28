
import { AppInfo } from './app_info';

// Constants.
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

/**
 * App ident version.
 */
export class AppIdentHeaders {
  /**
   * Add.
   * @param {object} app Express app instance.
   */
  static add(app) {
    // Defoine app info.
    const appInfo = new AppInfo();
    const customer = global.config && global.config.server && global.config.server.customer || DEFAULT_CUSTOMER;
    const environment = global.config && global.config.server && global.config.server.environment || DEFAULT_ENVIRONMENT;

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

