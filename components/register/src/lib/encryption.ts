import crypto from 'crypto';

export interface EncryptionConfig {
  /// Cypher key.
  key: string;

  /// Initialization vector size.
  iv_size?: number;
}

const HEX_KEY_RE = /^[0-9a-fA-F]{64}$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Parse the configured key into 32 raw bytes (AES-256).
 * Accepted: 64 hex characters, or base64 that decodes to exactly 32 bytes (e.g. `openssl rand -base64 32`).
 * The formats cannot collide: 64 hex characters decode from base64 to 48 bytes.
 */
export function parseEncryptionKey(key: unknown): Buffer {
  if (typeof key === 'string') {
    if (HEX_KEY_RE.test(key)) return Buffer.from(key, 'hex');
    if (key.length % 4 === 0 && BASE64_RE.test(key)) {
      const decoded = Buffer.from(key, 'base64');
      if (decoded.length === 32) return decoded;
    }
  }
  throw new Error('invalid encryption key');
}

export default class Encryption {
  static singleton: Encryption;

  public key: string;
  public iv_size: number;

  constructor(config: EncryptionConfig) {
    // Define singleton.
    if (!Encryption.singleton) {
      const { key, iv_size } = config;
      this.key = key;

      // Initialization vector size, default of 12 is recommended.
      this.iv_size = iv_size || 12;

      Encryption.singleton = this;
    }

    // Return singleton.
    return Encryption.singleton;
  }

  /// Encrypt data.
  encrypt(data: string): string {
    try {
      // Generate a random initialization vector.
      const iv = crypto.randomBytes(this.iv_size);

      // Using AES-256-GCM encryption algorithm.
      // https://en.wikipedia.org/wiki/Galois/Counter_Mode
      const cipher = crypto.createCipheriv('aes-256-gcm', parseEncryptionKey(this.key), iv);

      // Encrypt the data.
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Generate the authentication tag.
      const authTag = cipher.getAuthTag().toString('base64');

      return this.packEncrypted(encrypted, iv, authTag);
    } catch (error) {
      throw new Error(`Error while encrypting data: ${error.message}`);
    }
  }

  // Decrypt data.
  decrypt(encryptedData: string): string {
    try {
      // Split the IV, authentication tag, and encrypted data.
      const { iv, authTag, buffer } = this.unpackEncrypted(encryptedData);

      // Validate authentication tag length (GCM requires 16 bytes / 128 bits).
      if (!authTag || authTag.length !== 16) {
        throw new Error('Invalid authentication tag length. Expected 16 bytes.');
      }

      // Using AES-256-GCM decryption algorithm.
      const decipher = crypto.createDecipheriv('aes-256-gcm', parseEncryptionKey(this.key), iv);

      // Set the authentication tag.
      decipher.setAuthTag(authTag);

      // Decrypt the data.
      let decrypted = decipher.update(buffer.toString('base64'), 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Error while decrypting data: ${error.message}`);
    }
  }

  /// Combine the IV, authentication tag, and encrypted data into a single string.
  packEncrypted(encryptedData: string, iv: Buffer, authTag: string): string {
    return iv.toString('base64') + ':' + authTag + ':' + encryptedData;
  }

  /// Split the IV, authentication tag, and encrypted data into separate parts.
  private unpackEncrypted(encryptedData: string): { iv: Buffer; authTag: Buffer; buffer: Buffer } {
    try {
      const textParts = encryptedData.split(':');
      const iv = Buffer.from(textParts.shift(), 'base64');
      const authTag = Buffer.from(textParts.shift(), 'base64');
      const buffer = Buffer.from(textParts.join(':'), 'base64');
      return { iv, authTag, buffer };
    } catch (error) {
      throw new Error(`Error while unpacking encrypted data: ${error.message}`);
    }
  }
}
