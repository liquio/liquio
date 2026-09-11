import { AuthService } from '../services/auth';

/**
 * Delete history business.
 * @typedef {import('../services/auth')} UserAdminActionEntity
 */
export class UserAdminActionBusiness {
  private static singleton: UserAdminActionBusiness;

  public config: object;
  public authService: AuthService;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!UserAdminActionBusiness.singleton) {
      // Init params.
      this.config = config;
      this.authService = new AuthService(config.auth);

      // Define singleton.
      UserAdminActionBusiness.singleton = this;
    }

    // Return singleton.
    return UserAdminActionBusiness.singleton;
  }

  /**
   * Get list.
   * @param {{offset, limit, filter}} options Options.
   * @returns {Promise<{data: UserAdminActionEntity[], meta: {count: number, offset: number, limit: number}}>} User admin actions.
   */
  async getList(options) {
    return this.authService.getUserAdminActions(options);
  }
}
