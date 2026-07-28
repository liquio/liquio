const { ERROR_OVERRIDE } = require('../../../../../constants/error');

/**
 * Digest provider.
 * @interface
 */
class Provider {
  constructor() {}

  /**
   * Send.
   * @abstract
   * @param {string|string[]} emails - to Recipient email or email list. User ID can be used instead email.
   */
  async sendSubscribersToDigest(_emails) {
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = Provider;
