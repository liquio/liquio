import { Services } from '../services';
import { Express } from '../types';

const DEFAULT_CUSTOMER_HEADER = '1';
const DEFAULT_ENVIRONMENT_HEADER = '0';

/**
 * App ident version.
 */
export function useAppIdentHeaders(express: Express) {
  const customer = express.config?.customer ?? DEFAULT_CUSTOMER_HEADER;
  const environment = express.config?.environment ?? DEFAULT_ENVIRONMENT_HEADER;

  express.use(function (req, res, next) {
    const appInfo = Services.service('appInfo');
    res.removeHeader('Name');
    res.setHeader('Name', appInfo.name);
    res.removeHeader('Version');
    res.setHeader('Version', appInfo.version);
    res.setHeader('Customer', customer);
    res.setHeader('Environment', environment);
    next();
  });
}
