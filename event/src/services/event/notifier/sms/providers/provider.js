const { ERROR_OVERRIDE } = require('../../../../../constants/error');

/**
 * Sms provider.
 * @instance
 */
class Provider {
  /**
   * Send.
   * @abstract
   * @param {string|string[]} phones Phones.
   * @param {string} message Message.
   * @param {string} translitMessage Translit message.
   */
  /* eslint-disable-next-line no-unused-vars */
  async send(phones, message, translitMessage) {
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = Provider;
