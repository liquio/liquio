import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { Errors } from '../lib/errors';
import { shortenStringWithPrefixSuffix } from '../lib/helpers';
import { BaseService } from './base_service';
import { SignatureInfoResponse } from './x509.service';

const RANDOM_BYTES_LENGTH = 64;
const RANDOM_BYTES_STRING_ENCODING = 'hex';
const JWT_DEFAULT_EXPIRES_IN = 60;
const EDRPOU_TYPE = 'edrpou';
const IPN_TYPE = 'ipn';
const PASSPORT_TYPE = 'passport';
const ID_CARD_TYPE = 'idCard';

export interface IpnObject {
  DRFO?: string;
  EDRPOU?: string;
}

/**
 * Electronic digital signature (EDS) service.
 */
export class EdsService extends BaseService {
  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);
  }

  async init() {
    // Initialize service
  }

  /**
   * Get random content to sign.
   */
  async getRandomContentToSign() {
    // Prepare payload for JWT.
    const payload = {
      timestamp: Date.now(),
      random: crypto.randomBytes(RANDOM_BYTES_LENGTH).toString(RANDOM_BYTES_STRING_ENCODING),
    };

    // Define JWT params.
    const jwtSecret = this.config.jwt?.secret!;
    if (!jwtSecret) {
      this.log.save('get-random-content-to-sign-missing-jwt', {}, 'error');
      throw new Error(Errors.List.JWT_SECRET_NOT_FOUND.message);
    }

    const jwtExpiresIn = this.config.jwt?.expiresIn ?? JWT_DEFAULT_EXPIRES_IN; // Lifetime in seconds.

    // Create JWT.
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as number });
    this.log.save('get-random-content-to-sign-generated', { token }, 'info');

    // Response token.
    return token;
  }

  /**
   * Check random content sign.
   */
  async checkRandomContentSign(token: string, signature: string): Promise<{ signer: any; issuer: any; serial: any; pem: any }> {
    // Log signature checking.
    this.log.save('check-sign-started', { token, signature }, 'info');

    // Check params.
    if (typeof token !== 'string') {
      this.log.save('check-sign-token-error', { token }, 'error');
      throw new Error(Errors.List.TOKEN_NOT_FOUND.message);
    }
    if (typeof signature !== 'string') {
      this.log.save('check-sign-signature-error', { signature }, 'error');
      throw new Error(Errors.List.SIGNATURE_NOT_FOUND.message);
    }

    const { enabled: encryptionEnabled } = this.config.encryption || {};
    if (encryptionEnabled) {
      try {
        signature = this.decodeSignature(signature);
        this.log.save('check-sign-iit-decoded', { signature }, 'info');
        signature = await this.service('x509').hashToInternalSignature(signature, token);
        this.log.save('check-sign-iit-converted', { signature: shortenStringWithPrefixSuffix(signature) }, 'info');
      } catch (err) {
        this.log.save('check-sign-iit|decoding-error', { err }, 'error');
      }
    }

    // Check params.
    if (typeof signature !== 'string') {
      throw new Error(Errors.List.SIGNATURE_NOT_FOUND.message);
    }

    // Check JWT.
    const jwtSecret = this.config.jwt?.secret;
    if (!jwtSecret) {
      this.log.save('check-sign-missing-jwt-secret', {}, 'error');
      throw new Error(Errors.List.INVALID_TOKEN.message);
    }

    try {
      jwt.verify(token, jwtSecret);
    } catch {
      throw new Error(Errors.List.INVALID_TOKEN.message);
    }

    return this.processSignatureInfo(signature, token);
  }

  private async processSignatureInfo(signature: string, token: string): Promise<{ signer: any; issuer: any; serial: any; pem: any }> {
    let signer, issuer, serial, content, pem;

    try {
      const signatureInfo = await this.getSignatureInfoX509(signature);
      signer = signatureInfo.subject;
      issuer = signatureInfo.issuer;
      serial = signatureInfo.serial;
      content = signatureInfo.content;
      pem = signatureInfo.pem;
    } catch (error: any) {
      this.log.save('check-sign-eds|error', { error: error.message }, 'error');
      throw new Error(Errors.List.INVALID_TOKEN.message);
    }
    const contentString = content?.toString();
    this.log.save('check-sign-cert-issuer', { issuer, issuerOrganizationName: issuer?.organizationName, token }, 'info');
    if (contentString !== token) {
      this.log.save('check-sign-cert-wrong-token', { contentString: contentString ?? null, token: token || null }, 'error');
      throw new Error(Errors.List.WRONG_SIGNED_CONTENT.message);
    }

    // Log.
    this.log.save('authenticate-eds|user-info', { signer, issuer }, 'info');

    return { signer, issuer, serial, pem };
  }

  decodeSignature(signature: string) {
    const { algorithm, securityKey, enabled, iv } = this.config.encryption || {};

    if (!enabled) {
      throw new Error('Encryption is not enabled');
    }

    const decipher = crypto.createDecipheriv(algorithm as any, securityKey as string, iv as string);

    let decryptedData = decipher.update(signature, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');

    const { sign } = JSON.parse(decryptedData);
    return sign;
  }

  /**
   * Get signature info using x509 service.
   * @param {string} signature Signature.
   */
  async getSignatureInfoX509(signature: string): Promise<SignatureInfoResponse> {
    try {
      const certInfo = await this.service('x509').getSignatureInfo(signature);
      this.log.save('get-signature-info-certificate-data', { ...certInfo, content: 'REDACTED', pem: 'REDACTED' }, 'info');

      if (typeof certInfo.pem === 'undefined') {
        throw new Error(Errors.List.CAN_NOT_FIND_CERT.message);
      }
      if (typeof certInfo.content === 'undefined') {
        throw new Error(Errors.List.CAN_NOT_DEFINE_SIGNED_CONTENT.message);
      }

      return certInfo;
    } catch (error: any) {
      this.log.save('error-get-signature-info', { err: error.message });
      throw new Error(Errors.List.INCORRECT_SIGN.message);
    }
  }

  /**
   * Determine if user is legal entity.
   */
  isLegal({ EDRPOU }: { EDRPOU: string }): boolean {
    return Boolean(EDRPOU && EDRPOU.length !== 10);
  }

  /**
   * Determine if user is an individual entrepreneur.
   */
  isIndividualEntrepreneur({ EDRPOU, DRFO }: { EDRPOU: string; DRFO: string }): boolean {
    return Boolean(EDRPOU && EDRPOU.length === 10 && (!DRFO || DRFO === EDRPOU));
  }

  /**
   * Get user identification type.
   */
  getUserIdentificationType({ DRFO, EDRPOU }: { EDRPOU: string; DRFO: string }): string | undefined {
    if (EDRPOU && EDRPOU.length !== 10) {
      return EDRPOU_TYPE;
    } else {
      const ipnRegex = /^\d{10}$/;
      const passportRegex = /^[A-Za-zА-Яа-я]{2}\d{6}$/;
      const idCardRegex = /^\d{9}$/;

      let identificationType;
      if (ipnRegex.test(DRFO)) {
        identificationType = IPN_TYPE;
      } else if (passportRegex.test(DRFO)) {
        identificationType = PASSPORT_TYPE;
      } else if (idCardRegex.test(DRFO)) {
        identificationType = ID_CARD_TYPE;
      } else {
        identificationType = undefined;
      }
      return identificationType;
    }
  }

  /**
   * Get EDS servers list from EDS service.
   *
   * @deprecated This method is a placeholder for backward compatibility.
   * The eds-service has been removed and its functionality moved to sign-tool.
   * Returns an empty array.
   */
  async getEdsServersListFromEdsService(): Promise<any[]> {
    this.log.save('get-eds-servers-list-deprecated', {}, 'warn');
    // Placeholder implementation - returns empty list
    return [];
  }

  /**
   * Exit app.
   */
  async exitApp() {
    // Try to exit safety.
    (async () => process.exit(1))();

    // Wait after 5 seconds.
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 5000);
  }
}
