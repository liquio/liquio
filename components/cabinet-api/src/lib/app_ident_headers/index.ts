import AppInfo from '../app_info';

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
    const customer = (config && config.server && config.server.customer) || DEFAULT_CUSTOMER;
    const environment = (config && config.server && config.server.environment) || DEFAULT_ENVIRONMENT;

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
