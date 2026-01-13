const crypto = require('crypto');

// Constants.
const DEFAULT_IV_SIZE_IN_BYTES = 12;
const DEFAULT_ENC_ALGORITHM = 'aes-256-gcm';

/**
 * Encryptor.
 */
class Encryptor {
  /**
   * Constructor.
   * @param {object} config Encryption config.
   * @param {string} config.key Encryption key.
   * @param {number} [config.ivSize] Initialization vector size in bytes.
   * @param {string} [config.algorithm] Encryption algorithm.
   */
  constructor(config) {
    const { key, ivSize, algorithm } = config || {};

    if (!key) {
      throw new Error('Encryption key is required.');
    }

    this.key = key;
    this.ivSize = ivSize || DEFAULT_IV_SIZE_IN_BYTES;
    this.algorithm = algorithm || DEFAULT_ENC_ALGORITHM;
  }

  /**
   * Encrypt data with AES-256-GCM algorithm.
   * @param {string} data Data to encrypt.
   * @returns {Promise<{string}>}
   */
  encrypt(data) {
    try {
      // Generate a random initialization vector.
      const iv = crypto.randomBytes(this.ivSize);

      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.key, 'base64'),
        iv
      );

      // Encrypt the data.
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Generate the authentication tag.
      const authTag = cipher.getAuthTag();

      return this.pack(encrypted, iv, authTag);
    } catch (error) {
      throw new Error(`Error while encrypting data: ${error.message}`);
    }
  }

  /**
   * Decrypt data.
   * @param {string} packedData Packed data.
   * @returns {Promise<{string}>}
   */
  decrypt(packedData) {
    try {
      // Split the IV, authentication tag, and encrypted data.
      const { iv, authTag, encryptedData } = this.unpack(packedData);

      // Validate authentication tag length (GCM requires 16 bytes / 128 bits).
      if (!authTag || authTag.length !== 16) {
        throw new Error('Invalid authentication tag length. Expected 16 bytes.');
      }

      // Using AES-256-GCM decryption algorithm.
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.key, 'base64'),
        iv
      );

      // Set the authentication tag.
      decipher.setAuthTag(authTag);

      // Decrypt the data.
      let decrypted = decipher.update(
        encryptedData.toString('base64'),
        'base64',
        'utf8'
      );
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Error while decrypting data: ${error.message}`);
    }
  }

  /**
   * Combine the IV, authentication tag, and encrypted data into a single string.
   * @param {string} encryptedData Encrypted data.
   * @param {Buffer} iv Initialization vector.
   * @param {Buffer} authTag Authentication tag.
   * @returns {string}
   */
  pack(encryptedData, iv, authTag) {
    return (
      iv.toString('base64') +
      ':' +
      authTag.toString('base64') +
      ':' +
      encryptedData
    );
  }

  /**
   * Split the IV, authentication tag, and encrypted data into separate parts.
   * @param {string} packedData Packed data. (IV:AuthTag:EncryptedData)
   * @returns {{ iv: Buffer, authTag: Buffer, encryptedData: Buffer }>}
   */
  unpack(packedData) {
    try {
      const textParts = packedData.split(':');
      const iv = Buffer.from(textParts.shift(), 'base64');
      const authTag = Buffer.from(textParts.shift(), 'base64');
      const encryptedData = Buffer.from(textParts.join(':'), 'base64');
      return { iv, authTag, encryptedData };
    } catch (error) {
      throw new Error(`Error while unpacking: ${error.message}`);
    }
  }
}

module.exports = Encryptor;
