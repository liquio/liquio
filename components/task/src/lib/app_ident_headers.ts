import { AppInfo } from '@liquio/back-core';

import { getConfig } from './context';

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
    const customer = (getConfig() && getConfig().server && getConfig().server.customer) || DEFAULT_CUSTOMER;
    const environment = (getConfig() && getConfig().server && getConfig().server.environment) || DEFAULT_ENVIRONMENT;

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
