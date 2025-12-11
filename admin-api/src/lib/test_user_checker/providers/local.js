const IssuerCheckerProvider = require('../provider');
const { TEST_WORDS } = require('../constants');

/**
 * Local issuer checker provider.
 */
class LocalIssuerCheckerProvider extends IssuerCheckerProvider {
  constructor() {
    super('local');
  }

  /**
   * Check if issuer is test issuer.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestIssuer(user) {
    const providerId = user?.services?.local?.provider_id?.toLowerCase() || '';
    return TEST_WORDS.some((word) => providerId.includes(word));
  }
}

module.exports = LocalIssuerCheckerProvider;
