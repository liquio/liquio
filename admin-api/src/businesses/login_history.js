const AuthService = require('../services/auth');

/**
 * Login history business.
 * @typedef {import('../services/auth')} LoginHistoryEntity
 */
class LoginHistoryBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!LoginHistoryBusiness.singleton) {
      // Init params.
      this.config = config;
      this.authService = new AuthService(config.auth);

      // Define singleton.
      LoginHistoryBusiness.singleton = this;
    }

    // Return singleton.
    return LoginHistoryBusiness.singleton;
  }

  /**
   * Get list.
   * @param {{offset, limit, filter}} options Options.
   * @returns {Promise<{data: LoginHistoryEntity[], meta: {count: number, offset: number, limit: number}}>} Login history.
   */
  async getList(options) {
    return this.authService.getLoginHistory(options);
  }
}

module.exports = LoginHistoryBusiness;
