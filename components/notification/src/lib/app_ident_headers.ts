import { AppInfo } from './app_info';
import { conf } from '../config/config';

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
  static add(app: any): void {
    // Defoine app info.
    const appInfo = new AppInfo();
    const customer = conf.customer || DEFAULT_CUSTOMER;
    const environment = conf.environment || DEFAULT_ENVIRONMENT;

    // Set headers.
    app.use(function (req: any, res: any, next: any) {
      // CORS.
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, token, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

      // App name and version.
      res.header('Name', appInfo.name);
      res.header('Version', appInfo.version);
      res.header('Customer', customer);
      res.header('Environment', environment);
      res.header('Access-Control-Expose-Headers', 'Name, Version, Customer, Environment');
      next();
    });
  }
}
