import { MailerLiteProvider } from './providers/mailerlite';

const DEFAULT_PROVIDER = 'mailerlite';

/**
 * Digest notifier.
 */
export class DigestNotifier {
  static singleton: DigestNotifier;

  provider: MailerLiteProvider;

  constructor(config: any) {
    // Define singleton.
    if (!DigestNotifier.singleton) {
      config.provider = config.provider || DEFAULT_PROVIDER;
      this.provider = new (DigestNotifier.ProvidersList as any)[config.provider](config);
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
  async send(emails: string | string[]): Promise<any> {
    return await this.provider.sendSubscribersToDigest(emails);
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    return await this.provider.sendPingRequest();
  }
}
