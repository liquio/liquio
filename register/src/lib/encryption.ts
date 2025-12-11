import crypto from 'crypto';

export interface EncryptionConfig {
  /// Cypher key.
  key: string;

  /// Initialization vector size.
  iv_size?: number;
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
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.key), iv);

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

      // Using AES-256-GCM decryption algorithm.
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.key), iv);

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
