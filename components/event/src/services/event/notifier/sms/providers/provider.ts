import { ERROR_OVERRIDE } from '../../../../../constants/error';

/**
 * Sms provider.
 * @instance
 */
export class Provider {
  /**
   * Send.
   * @abstract
   * @param {string|string[]} phones Phones.
   * @param {string} message Message.
   * @param {string} translitMessage Translit message.
   */
   
  async send(_phones: string | string[], _message: string, _translitMessage: string): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }
}
