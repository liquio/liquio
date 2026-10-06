import { TOTP as OTPAuthTOTP, Secret } from 'otpauth';

export class TOTP {
  private readonly totp: OTPAuthTOTP;

  /**
   * Generate new TOTP secret for user
   * @returns {string} Base32 encoded secret string
   */
  static createSecret(): string {
    const { base32 } = new Secret();
    return base32;
  }

  /**
   * @param {string} secret Secret key
   * @param {object} [options] Options
   * @param {string} [options.issuer] TOTP issuer
   * @param {string} [options.label] Label for user
   */
  constructor(secret: string | Secret, options: { issuer?: string; label?: string } = {}) {
    this.totp = new OTPAuthTOTP({
      issuer: options.issuer ?? '',
      label: options.label ?? 'OTPAuth',
      algorithm: 'SHA1',
      period: 30,
      digits: 6,
      secret,
    });
  }

  /**
   * Generate new TOTP token
   */
  generate(): string {
    return this.totp.generate();
  }

  /**
   * Validate TOTP token against secret. Details:
   * - https://datatracker.ietf.org/doc/html/rfc4226#section-7
   * - https://datatracker.ietf.org/doc/html/rfc6238#section-5
   *
   * @param {string} token TOTP token to verify against secret
   * @param {number} [window=1] Verification window (accaptable number of periods before and after current time)
   * @returns {boolean} Result of verification
   */
  validate(token: string, window: number = 1): boolean {
    return this.totp.validate({ token, window }) !== null;
  }

  /**
   * Generate TOTP URI
   */
  toString(): string {
    return this.totp.toString();
  }
}
