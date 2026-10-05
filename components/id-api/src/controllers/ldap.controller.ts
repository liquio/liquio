import { body } from 'express-validator';

import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

// Constants.
const MAX_GROUP_DNS = 100;
const MAX_GROUP_DN_LENGTH = 2048;
const HTTP_STATUS_CODE_NOT_FOUND = 404;
const HTTP_STATUS_CODE_SERVICE_UNAVAILABLE = 503;
const ERROR_MESSAGE_PROVIDER_DISABLED = 'LDAP provider is not enabled.';
const ERROR_MESSAGE_DIRECTORY_UNAVAILABLE = 'Directory is temporarily unavailable.';

/**
 * Ldap controller. Service-to-service endpoints (Basic auth) backed by the directory.
 */
export class LdapController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'ldap');
  }

  protected registerRoutes(): void {
    this.router.post(
      '/ldap/groups/exists',
      this.auth.basic(),
      [
        body('dns').isArray({ min: 1, max: MAX_GROUP_DNS }),
        body('dns.*').isString().trim().isLength({ min: 1, max: MAX_GROUP_DN_LENGTH }),
        this.handleValidation.bind(this),
      ],
      this.groupsExist.bind(this),
    );
  }

  /**
   * Groups exist. Returns the subset of the given group DNs that exist in the directory.
   * Responds with 404 when the ldap provider is disabled and with 503 on directory errors.
   */
  async groupsExist(req: Request, res: Response): Promise<void> {
    // Validators have already checked and trimmed the body.
    const { dns } = req.body as { dns: string[] };

    const ldap = this.service('ldap');
    if (!ldap.isEnabled) {
      return this.responseError(res, ERROR_MESSAGE_PROVIDER_DISABLED, HTTP_STATUS_CODE_NOT_FOUND);
    }

    try {
      const existing = await ldap.groupsExist(dns);
      this.responseData(res, { existing });
    } catch (error: any) {
      this.log.save('ldap-groups-exists-error', { error: error?.message }, 'error');
      this.responseError(res, ERROR_MESSAGE_DIRECTORY_UNAVAILABLE, HTTP_STATUS_CODE_SERVICE_UNAVAILABLE);
    }
  }
}
