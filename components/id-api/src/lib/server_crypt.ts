// Import.
import crypto from 'crypto';

// Constants.
const ORIGINAL_DATA_ENCODING = 'utf8';
const ENCRYPTED_DATA_ENCODING = 'base64';
const WRONG_PARAMS_ERROR = 'Key or data not defined.';
const SERVER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4uz+HkUEYrmEA611G4xa
CjSa/2Md82bmhUxQxM2BKRtRawMwrSbhAWqXJf/kvrdCnb6w/lRuFZSPQSQ7mHFQ
SdHuh/OCs6uR9frMNq5bv17alUXg6TFilO4JzjPGP0e3nHWwaXSrrKjObXH3AcfC
k7MDMVZeO3qdDAFzy9wp7M2pldnh4uOX9ZBsw2UlHEBPUwExkB8hH4+ZYX6KLiiA
PqQuYSVOczPay96AAphrqHhkj217+Bd6eaDHG+beciEgTEiAqpqGH+8p/PWTbNYS
/M/Z9OtkSYBwFVB5s/p97M7Zmm0HJxPPUsRFWJRZHxcLfiG3SkIMtMaRlNtWNp9V
+wIDAQAB
-----END PUBLIC KEY-----
`;

/**
 * Server crypt.
 */
export class ServerCrypt {
  /**
   * Encrypt by private key.
   * @param {string} key Private key.
   * @param {string} data Data to encrypt.
   * @returns {string} Encrypted data.
   */
  static encryptByPrivateKey(key: string, data: string): string {
    // Check.
    if (!key || !data) {
      throw new Error(WRONG_PARAMS_ERROR);
    }

    // Encrypt.
    const dataBuffer = Buffer.from(data, ORIGINAL_DATA_ENCODING);
    const encryptedData = crypto.privateEncrypt(key, dataBuffer).toString(ENCRYPTED_DATA_ENCODING);
    return encryptedData;
  }

  /**
   * Decrypt by public key.
   * @param {string} key Private key.
   * @param {string} data Data to decrypt.
   * @returns {string} Decrypted data.
   */
  static decryptByPublicKey(key: string, data: string): string {
    // Check.
    if (!key || !data) {
      throw new Error(WRONG_PARAMS_ERROR);
    }

    // Decrypt.
    const dataBuffer = Buffer.from(data, ENCRYPTED_DATA_ENCODING);
    const decryptedData = crypto.publicDecrypt(key, dataBuffer).toString(ORIGINAL_DATA_ENCODING);
    return decryptedData;
  }

  /**
   * Decrypt by public key.
   * @param {string} data Data to decrypt.
   * @returns {string} Decrypted data.
   */
  static decryptByServerPublicKey(data: string): string {
    return ServerCrypt.decryptByPublicKey(SERVER_PUBLIC_KEY, data);
  }
}
