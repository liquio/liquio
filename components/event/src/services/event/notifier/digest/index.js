const MailerLiteProvider = require('./providers/mailerlite');

const DEFAULT_PROVIDER = 'mailerlite';

/**
 * Digest notifier.
 */
class DigestNotifier {
  constructor(config) {
    // Define singleton.
    if (!DigestNotifier.singleton) {
      config.provider = config.provider || DEFAULT_PROVIDER;
      this.provider = new DigestNotifier.ProvidersList[config.provider](config);
      DigestNotifier.singleton = this;
    }

    return DigestNotifier.singleton;
  }

  /**
   * Get providers list.
   */
  static get ProvidersList() {
    return { mailerlite: MailerLiteProvider };
  }

  /**
   * Send emails.
   * @param {string|string[]} emails Recipient email or email list.
   * @returns {object}
   */
  async send(emails) {
    return await this.provider.sendSubscribersToDigest(emails);
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    return await this.provider.sendPingRequest();
  }
}

module.exports = DigestNotifier;
