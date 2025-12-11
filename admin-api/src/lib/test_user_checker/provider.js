// Constants.
const METHOD_NOT_DEFINED_ERROR = 'Method is not defined in current provider.';

/**
 * Issuer checker provider.
 */
class IssuerCheckerProvider {
  /**
   * Constructor.
   * @param {string} name Provider name.
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if issuer is test issuer.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestIssuer(_user) {
    throw new Error(METHOD_NOT_DEFINED_ERROR);
  }
}

module.exports = IssuerCheckerProvider;
