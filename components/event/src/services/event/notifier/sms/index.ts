import { LiquioProvider } from './providers/liquio';

/**
 * Sms notifier.
 */
export class SmsNotifier {
  static singleton: SmsNotifier;

  provider: LiquioProvider;

  constructor(config: any) {
    // Define singleton.
    if (!SmsNotifier.singleton) {
      this.provider = (SmsNotifier.ProvidersList as any)[config.provider] && new (SmsNotifier.ProvidersList as any)[config.provider](config);
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
  async send(phones: string | string[], message: string, translitMessage: string): Promise<any> {
    return await this.provider.send(phones, message, translitMessage);
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    return await this.provider.sendPingRequest();
  }
}
