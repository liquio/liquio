const IssuerCheckerProvider = require('../provider');
const { TEST_WORDS } = require('../constants');

/**
 * Eds issuer checker provider.
 */
class EdsIssuerCheckerProvider extends IssuerCheckerProvider {
  constructor() {
    super('eds');
  }

  /**
   * Check if issuer is test issuer.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestIssuer(user) {
    const issuerInfo = user?.services?.eds?.data?.issuerInfo || {};
    const commonName = issuerInfo?.commonName?.toLowerCase() || '';
    return TEST_WORDS.some((word) => commonName.includes(word));
  }
}

module.exports = EdsIssuerCheckerProvider;
