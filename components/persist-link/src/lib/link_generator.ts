// Import.
import crypto from 'node:crypto';

import { getLog } from './context';
import LinksModel from '../models/links';

// Constants.
const CRYPT_ALGORITHM = 'aes-256-cbc';
const ENCRYPT_IN_ENCODING = 'utf8';
const ENCRYPT_OUT_ENCODING = 'hex';
const DECRYPT_IN_ENCODING = 'hex';
const DECRYPT_OUT_ENCODING = 'utf8';
const CRYPT_ALGORITHM_V2 = 'aes-256-gcm';
const V2_PREFIX = '2.';
const V2_IV_LENGTH = 12;
const V2_TAG_LENGTH = 16;
const V2_ENCODING = 'base64url';
const DEFAULT_LINK_PREFIX = 'http://localhost:3346/';
const META_RANDOM_BYTES_LENGTH = 4;
const META_RANDOM_BYTES_ENCODING = 'hex';
const DEFAULT_SMALL_HASH_RANDOM_BYTES_LENGTH = 16;
const SMALL_HASH_RANDOM_BYTES_ENCODING = 'hex';

/**
 * Link generator.
 */
class LinkGenerator {
  /**
   * Link generator constructor.
   * @param {object} config Link genetrator config.
   */
  constructor(config) {
    if (!LinkGenerator.singleton) {
      this.config = config;
      if (!config.secretKey) throw new Error('[persist-link] link_generator.secretKey is required but not set in config');
      this.secretKey = config.secretKey;
      if (!config.cryptIv) throw new Error('[persist-link] link_generator.cryptIv is required but not set in config');
      this.cryptIv = config.cryptIv;
      this.linksPrefix = config.linksPrefix || DEFAULT_LINK_PREFIX;
      this.smallHashRandomBytesLength = config.smallHashRandomBytesLength || DEFAULT_SMALL_HASH_RANDOM_BYTES_LENGTH;
      this.linksModel = new LinksModel().model;
      LinkGenerator.singleton = this;
    }
    return LinkGenerator.singleton;
  }

  /**
   * Find link by hash.
   * @param {string} hash Hash.
   * @returns {object} Static link.
   */
  async findLinkByHash(hash) {
    return await this.linksModel.findOne({ where: { key: hash } });
  }

  /**
   * Generate link by object.
   * @param {{type, options, small, definedHash}} data Data.
   * @returns {string} Static link.
   */
  async generateLinkByData(data) {
    // Define params.
    const { definedHash } = data;

    // Define data to enctypt.
    const dataToEncrypt = {
      m: {
        r: crypto.randomBytes(META_RANDOM_BYTES_LENGTH).toString(META_RANDOM_BYTES_ENCODING),
        t: Date.now(),
      },
      ...data,
    };

    // Stringify data.
    let dataString = JSON.stringify(dataToEncrypt);

    // Encrypt stringified data.
    const encryptedDataString = this.encrypt(dataString);

    // Always save to DB: links are only openable by hash lookup (the small flag is kept for compatibility).
    const smallHash = definedHash || crypto.randomBytes(this.smallHashRandomBytesLength).toString(SMALL_HASH_RANDOM_BYTES_ENCODING);
    await this.linksModel.create({ key: smallHash, data: encryptedDataString });

    // Define and return link.
    const link = `${this.linksPrefix}${smallHash}`;
    return link;
  }

  /**
   * Define data by link.
   * @param {string} link Static link.
   * @returns {object} Data object.
   */
  async defineDataByLink(link) {
    // Get encrypted data string.
    const encryptedDataString = link.split('/').pop();

    // Search in DB.
    let dbRecord;
    try {
      dbRecord = await this.linksModel.findAll({ where: { key: encryptedDataString } });
    } catch (error) {
      getLog().save('db-record-search-error', error && error.message);
      throw error;
    }
    const encryptedDataStringInDb = dbRecord && dbRecord[0] && dbRecord[0].dataValues && dbRecord[0].dataValues.data;
    if (!encryptedDataStringInDb) {
      throw new Error('Data to decrypt not found.');
    }

    // Decrypt data.
    try {
      const dataString = this.decrypt(encryptedDataStringInDb);
      return JSON.parse(dataString);
    } catch (error) {
      // Same generic error for any decrypt/parse failure (no oracle in messages).
      getLog().save('link-decrypt-error', { error: error && error.message });
      throw new Error('Data to decrypt not found.');
    }
  }

  /**
   * Encrypt (AES-256-GCM, random IV, versioned output).
   * @private
   * @param {string} dataString Data string to encrypt.
   * @returns {string} Encrypted string.
   */
  encrypt(dataString) {
    return this.encryptV2(dataString);
  }

  /**
   * Decrypt. Versioned (`2.` prefix, GCM) or legacy (hex, CBC).
   * @private
   * @param {string} dataString Data string to decrypt.
   * @returns {string} Decrypted string.
   */
  decrypt(dataString) {
    if (typeof dataString === 'string' && dataString.startsWith(V2_PREFIX)) {
      return this.decryptV2(dataString);
    }
    return this.decryptLegacy(dataString);
  }

  /**
   * Encrypt V2.
   * @private
   * @param {string} dataString Data string to encrypt.
   * @returns {string} `2.` + base64url(iv | ciphertext | tag).
   */
  encryptV2(dataString) {
    const iv = crypto.randomBytes(V2_IV_LENGTH);
    const cipher = crypto.createCipheriv(CRYPT_ALGORITHM_V2, this.secretKey, iv, { authTagLength: V2_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(dataString, ENCRYPT_IN_ENCODING), cipher.final()]);
    const tag = cipher.getAuthTag();
    return V2_PREFIX + Buffer.concat([iv, encrypted, tag]).toString(V2_ENCODING);
  }

  /**
   * Decrypt V2.
   * @private
   * @param {string} dataString Versioned string.
   * @returns {string} Decrypted string.
   */
  decryptV2(dataString) {
    const raw = Buffer.from(dataString.slice(V2_PREFIX.length), V2_ENCODING);
    if (raw.length < V2_IV_LENGTH + V2_TAG_LENGTH) {
      throw new Error('Invalid data.');
    }
    const iv = raw.subarray(0, V2_IV_LENGTH);
    const tag = raw.subarray(raw.length - V2_TAG_LENGTH);
    const encrypted = raw.subarray(V2_IV_LENGTH, raw.length - V2_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(CRYPT_ALGORITHM_V2, this.secretKey, iv, { authTagLength: V2_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(DECRYPT_OUT_ENCODING);
  }

  /**
   * Decrypt legacy (AES-256-CBC, fixed IV). Kept only so already issued links stay valid.
   * @private
   * @param {string} dataString Data string to decrypt.
   * @returns {string} Decrypted string.
   */
  decryptLegacy(dataString) {
    const decipher = crypto.createDecipheriv(CRYPT_ALGORITHM, this.secretKey, this.cryptIv);
    let decryptedData = decipher.update(dataString, DECRYPT_IN_ENCODING, DECRYPT_OUT_ENCODING);
    decryptedData += decipher.final(DECRYPT_OUT_ENCODING);
    return decryptedData;
  }

  /**
   * Encrypt legacy (test helper only, to produce already-issued-format hashes).
   * @private
   * @param {string} dataString Data string to encrypt.
   * @returns {string} Hex string.
   */
  encryptLegacy(dataString) {
    const cipher = crypto.createCipheriv(CRYPT_ALGORITHM, this.secretKey, this.cryptIv);
    let encryptedData = cipher.update(dataString, ENCRYPT_IN_ENCODING, ENCRYPT_OUT_ENCODING);
    encryptedData += cipher.final(ENCRYPT_OUT_ENCODING);
    return encryptedData;
  }
}

// Export.
export default LinkGenerator;
