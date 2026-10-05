import { body } from 'express-validator';

import { LdapErrorMessage } from '../services/ldap.service';
import { LdapDirectoryError } from '../services/ldap_sync.service';
import { Express, HttpStatusCode, Request, Response, Router } from '../types';
import { BaseController, ControllerErrorMessage } from './base_controller';

// Constants.
const MAX_GROUP_DNS = 100;
const MAX_GROUP_DN_LENGTH = 2048;

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
    this.router.post('/user/ldap/sync/:userId', this.auth.basic(), this.syncUser.bind(this));
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
      return this.responseError(res, LdapErrorMessage.PROVIDER_DISABLED, HttpStatusCode.NotFound);
    }

    try {
      const existing = await ldap.groupsExist(dns);
      this.responseData(res, { existing });
    } catch (error: any) {
      this.log.save('ldap-groups-exists-error', { error: error?.message }, 'error');
      this.responseError(res, LdapErrorMessage.DIRECTORY_UNAVAILABLE, HttpStatusCode.ServiceUnavailable);
    }
  }

  /**
   * Check one user against the directory right now, and revoke the access if it is lost.
   * Responds with 400 on a malformed id, 404 when the ldap provider is disabled or the user has no ldap record
   * and with 503 when the directory cannot answer (nothing is changed then).
   */
  async syncUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!this.service('auth').isUserId(userId)) {
      return this.responseError(res, ControllerErrorMessage.INVALID_USER_ID, HttpStatusCode.BadRequest);
    }

    if (!this.service('ldap').isEnabled) {
      return this.responseError(res, LdapErrorMessage.PROVIDER_DISABLED, HttpStatusCode.NotFound);
    }

    try {
      const outcome = await this.service('ldapSync').checkUserById(userId, { ensureRevoked: true });
      if (!outcome) {
        return this.responseError(res, LdapErrorMessage.NO_LDAP_USER, HttpStatusCode.NotFound);
      }
      this.responseData(res, outcome);
    } catch (error: any) {
      this.log.save('ldap-sync-user-error', { userId, error: error?.message }, 'error');
      if (error instanceof LdapDirectoryError) {
        return this.responseError(res, LdapErrorMessage.DIRECTORY_UNAVAILABLE, HttpStatusCode.ServiceUnavailable);
      }
      this.responseError(res, ControllerErrorMessage.INTERNAL, HttpStatusCode.InternalServerError);
    }
  }
}
