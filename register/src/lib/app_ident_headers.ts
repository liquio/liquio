import { Application } from 'express';
import AppInfo from './app_info';

// Constants.
const DEFAULT_CUSTOMER = '1';
const DEFAULT_ENVIRONMENT = '0';

export interface AppIdentHeadersConfig {
  server?: {
    customer?: string;
    environment?: string;
  };
}

/**
 * App ident version.
 */
export default class AppIdentHeaders {
  /**
   * Add.
   * @param {object} app Express app instance.
   * @param {object} config App config.
   */
  static add(app: Application, config: AppIdentHeadersConfig) {
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
