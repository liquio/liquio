import { AppInfo } from '@liquio/back-core';

import { getConfig } from '../context';

// Constants.
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

/**
 * Application identification headers middleware
 */
class AppIdentHeaders {
  /**
   * Add middleware to Express app
   * @param app - Express app instance
   */
  static add(app: any): void {
    app.use(AppIdentHeaders.middleware);
  }

  /**
   * Middleware function that sets app identification headers
   */
  static get middleware() {
    const appInfo = new AppInfo();
    const customer = (getConfig() && getConfig().server && getConfig().server.customer) || DEFAULT_CUSTOMER;
    const environment = (getConfig() && getConfig().server && getConfig().server.environment) || DEFAULT_ENVIRONMENT;

    return (req: any, res: any, next: () => void): void => {
      res.setHeader('Name', appInfo.name);
      res.setHeader('Version', appInfo.version);
      res.setHeader('Customer', customer);
      res.setHeader('Environment', environment);
      next();
    };
  }
}

export default AppIdentHeaders;
