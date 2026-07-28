const LiquioProvider = require('./providers/liquio');

/**
 * Sms notifier.
 */
class SmsNotifier {
  constructor(config) {
    // Define singleton.
    if (!SmsNotifier.singleton) {
      this.provider = SmsNotifier.ProvidersList[config.provider] && new SmsNotifier.ProvidersList[config.provider](config);
      SmsNotifier.singleton = this;
    }
    return SmsNotifier.singleton;
  }

  /**
   * Get providers list.
   */
  static get ProvidersList() {
    return { liquio: LiquioProvider };
  }

  /**
   * Send email.
   * @param {string|string[]} phones Phones.
   * @param {string} message Message.
   * @param {string} translitMessage Translit message.
   * @returns {object}
   */
  async send(phones, message, translitMessage) {
    return await this.provider.send(phones, message, translitMessage);
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    return await this.provider.sendPingRequest();
  }
}

module.exports = SmsNotifier;
