import { IssuerCheckerProvider } from '../provider';
import { TEST_WORDS } from '../constants';

/**
 * Local issuer checker provider.
 */
export class LocalIssuerCheckerProvider extends IssuerCheckerProvider {
  constructor() {
    super('local');
  }

  /**
   * Check if issuer is test issuer.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestIssuer(user) {
    const providerId = user?.services?.local?.provider_id?.toLowerCase() || '';
    return TEST_WORDS.some((word) => providerId.includes(word));
  }
}
