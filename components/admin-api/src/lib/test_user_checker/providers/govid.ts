import { IssuerCheckerProvider } from '../provider';
import { TEST_WORDS } from '../constants';

/**
 * Govid issuer checker provider.
 */
export class GovidIssuerCheckerProvider extends IssuerCheckerProvider {
  constructor() {
    super('govid');
  }

  /**
   * Check if issuer is test issuer.
   * @param {object} user User.
   * @returns {boolean}
   */
  isTestIssuer(user) {
    const issuerInfo = user?.services?.govid?.data?.raw || {};
    const issuerCN = issuerInfo?.issuercn?.toLowerCase() || '';
    return TEST_WORDS.some((word) => issuerCN.includes(word));
  }
}
