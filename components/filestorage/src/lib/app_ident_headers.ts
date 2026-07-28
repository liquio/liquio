import { AppInfo } from './app_info';

const DEFAULT_CUSTOMER = 1;
const DEFAULT_ENVIRONMENT = 0;

/**
 * App ident version.
 */
export class AppIdentHeaders {
  /**
   * Add.
   * @param {object} app Express app instance.
   * @param {object} config App config.
   */
  static add(app: any, config: any) {
    // Defoine app info.
    const appInfo = new AppInfo();
    const customer = (config && config.server && config.server.customer) || DEFAULT_CUSTOMER;
    const environment = (config && config.server && config.server.environment) || DEFAULT_ENVIRONMENT;

    // Set headers.
    app.use(function (req: any, res: any, next: any) {
      res.setHeader('Name', appInfo.name);
      res.setHeader('Version', appInfo.version);
      res.setHeader('Customer', customer);
      res.setHeader('Environment', environment);
      next();
    });
  }
}
