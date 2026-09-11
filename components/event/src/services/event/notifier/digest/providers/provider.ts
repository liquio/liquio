import { ERROR_OVERRIDE } from '../../../../../constants/error';

/**
 * Digest provider.
 * @interface
 */
export class Provider {
  constructor() {}

  /**
   * Send.
   * @abstract
   * @param {string|string[]} emails - to Recipient email or email list. User ID can be used instead email.
   */
  async sendSubscribersToDigest(_emails: string | string[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }
}
