const IssuerCheckerProvider = require('../provider');
const { TEST_WORDS } = require('../constants');

/**
 * Govid issuer checker provider.
 */
class GovidIssuerCheckerProvider extends IssuerCheckerProvider {
  constructor() {
    super('govid');
  }

  /**
   * Check if issuer is test issuer.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestIssuer(user) {
    const issuerInfo = user?.services?.govid?.data?.raw || {};
    const issuerCN = issuerInfo?.issuercn?.toLowerCase() || '';
    return TEST_WORDS.some((word) => issuerCN.includes(word));
  }
}

module.exports = GovidIssuerCheckerProvider;
