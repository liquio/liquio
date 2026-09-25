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
    const { small, definedHash } = data;

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

    // Check if small link needed (with saving to DB).
    let smallHash;
    if (small) {
      // Generate small hash.
      smallHash = definedHash || crypto.randomBytes(this.smallHashRandomBytesLength).toString(SMALL_HASH_RANDOM_BYTES_ENCODING);

      // Save to DB.
      await this.linksModel.create({ key: smallHash, data: encryptedDataString });
    }

    // Define and return link.
    const link = `${this.linksPrefix}${smallHash || encryptedDataString}`;
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
    const dataString = this.decrypt(encryptedDataStringInDb);
    const data = JSON.parse(dataString);
    return data;
  }

  /**
   * Encrypt.
   * @private
   * @param {string} dataString Data string to encrypt.
   * @returns {string} Encrypted string.
   */
  encrypt(dataString) {
    const cipher = crypto.createCipheriv(CRYPT_ALGORITHM, this.secretKey, this.cryptIv);
    let encryptedData = cipher.update(dataString, ENCRYPT_IN_ENCODING, ENCRYPT_OUT_ENCODING);
    encryptedData += cipher.final(ENCRYPT_OUT_ENCODING);
    return encryptedData;
  }

  /**
   * Decrypt.
   * @private
   * @param {string} dataString Data string to decrypt.
   * @returns {string} Decrypted string.
   */
  decrypt(dataString) {
    const decipher = crypto.createDecipheriv(CRYPT_ALGORITHM, this.secretKey, this.cryptIv);
    let decryptedData = decipher.update(dataString, DECRYPT_IN_ENCODING, DECRYPT_OUT_ENCODING);
    decryptedData += decipher.final(DECRYPT_OUT_ENCODING);
    return decryptedData;
  }
}

// Export.
export default LinkGenerator;
