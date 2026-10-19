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

const USED_TOKEN_LOCK_PREFIX = 'eds-used-token';

export interface IpnObject {
  DRFO?: string;
  EDRPOU?: string;
}

/**
 * Electronic digital signature (EDS) service.
 */
export class EdsService extends BaseService {
  // Fallback single-use store (token hash -> expiry ms) for deployments without redis.
  private readonly usedTokens = new Map<string, number>();

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
    this.log.save('get-random-content-to-sign-generated', { expiresIn: jwtExpiresIn }, 'info');

    // Response token.
    return token;
  }

  /**
   * Check random content sign.
   */
  async checkRandomContentSign(token: string, signature: string): Promise<{ signer: any; issuer: any; serial: any; pem: any }> {
    // Log signature checking.
    this.log.save('check-sign-started', { tokenLength: token?.length, signatureLength: signature?.length }, 'info');

    // Check params.
    if (typeof token !== 'string') {
      this.log.save('check-sign-token-error', { tokenType: typeof token }, 'error');
      throw new Error(Errors.List.TOKEN_NOT_FOUND.message);
    }
    if (typeof signature !== 'string') {
      this.log.save('check-sign-signature-error', { signatureType: typeof signature }, 'error');
      throw new Error(Errors.List.SIGNATURE_NOT_FOUND.message);
    }

    const { enabled: encryptionEnabled } = this.config.encryption || {};
    if (encryptionEnabled) {
      try {
        signature = this.decodeSignature(signature);
        this.log.save('check-sign-iit-decoded', { signatureLength: signature?.length }, 'info');
        signature = await this.service('x509').hashToInternalSignature(signature, token);
        this.log.save('check-sign-iit-converted', { signature: shortenStringWithPrefixSuffix(signature) }, 'info');
      } catch (err) {
        this.log.save('check-sign-iit|decoding-error', { error: (err as any)?.message }, 'error');
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

    let expiresAtSeconds: number;
    try {
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      expiresAtSeconds = payload.exp ?? Math.floor(Date.now() / 1000) + JWT_DEFAULT_EXPIRES_IN;
    } catch {
      throw new Error(Errors.List.INVALID_TOKEN.message);
    }

    const result = await this.processSignatureInfo(signature, token);

    // The challenge is single-use: consume it only after the signature has been verified over it.
    if (!(await this.consumeToken(token, expiresAtSeconds))) {
      this.log.save('check-sign-token-replay', {}, 'error');
      throw new Error(Errors.List.INVALID_TOKEN.message);
    }

    return result;
  }

  /**
   * Atomically mark the challenge token as used until it expires.
   * @returns false if the token has been used already.
   */
  private async consumeToken(token: string, expiresAtSeconds: number): Promise<boolean> {
    const key = crypto.createHash('sha256').update(token).digest('hex');
    const ttl = Math.max(1, expiresAtSeconds - Math.floor(Date.now() / 1000));

    const redis = this.service('redis');
    if (redis?.isEnabled) {
      return (await redis.acquireLock(`${USED_TOKEN_LOCK_PREFIX}:${key}`, ttl)) !== null;
    }

    // In-memory fallback (single instance only).
    const now = Date.now();
    for (const [k, expiresAt] of this.usedTokens) {
      if (expiresAt <= now) this.usedTokens.delete(k);
    }
    if (this.usedTokens.has(key)) return false;
    this.usedTokens.set(key, now + ttl * 1000);
    return true;
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
    this.log.save('check-sign-cert-issuer', { issuer, issuerOrganizationName: issuer?.organizationName }, 'info');
    if (contentString !== token) {
      this.log.save('check-sign-cert-wrong-token', { hasContent: contentString !== undefined }, 'error');
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
    this.log.save('get-eds-servers-list-deprecated', {}, 'warning');
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
