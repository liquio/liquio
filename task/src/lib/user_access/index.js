
const UserIpAccessProvider = require('./access_providers/user_ip');

// Providers.
const PROVIDERS_CLASSES = [
  UserIpAccessProvider
];

/**
 * User access.
 */
class UserAccess {
  /**
   * User access constructor.
   */
  constructor() {
    // Singleton.
    if (!UserAccess.singleton) {
      // Init providers.
      this.providers = UserAccess.ProvidersClasses.map(v => new v(global.config));

      // Define singleton.
      UserAccess.singleton = this;
    }

    // Return singleton.
    return UserAccess.singleton;
  }

  /**
   * Check access.
   * @param {object} req HTTP request.
   * @returns {Promise<{isAllowed: boolean, declinedByProvider: string}>} Acces result promise.
   */
  async checkAccess(req) {
    // Handle all access providers.
    for (const provider of this.providers) {
      try {
        const accessAllowed = await provider.checkAccess(req);
        if (!accessAllowed) {
          return { isAllowed: false, declinedByProvider: provider.name };
        }
      } catch (error) {
        log.save('check-access-error', { error: error && error.message });
        return { isAllowed: false, declinedByProvider: provider.name };
      }
    }

    // Allowed if not declined by any of providers.
    return { isAllowed: true, declinedByProvider: null };
  }

  /**
   * Providers classes.
   * @private
   * @returns {PROVIDERS_CLASSES} Access providers classes.
   */
  static get ProvidersClasses() {
    return PROVIDERS_CLASSES;
  }
}

module.exports = UserAccess;
