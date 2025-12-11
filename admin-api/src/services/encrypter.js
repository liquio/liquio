const crypto = require('crypto');

class EncrypterService {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    if (!EncrypterService.singleton) {
      this.config = config;
      EncrypterService.singleton = this;
    }

    return EncrypterService.singleton;
  }

  /**
   * Encrypt.
   * @param {string} text Text.
   * @returns {string}
   */
  encrypt(text) {
    const cipher = crypto.createCipheriv(config.server.crypto.algorithm, config.server.crypto.password, config.server.crypto.iv);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  }

  /**
   * Decrypt.
   * @param {string} text Text.
   * @returns {string}
   */
  decrypt(text) {
    const decipher = crypto.createDecipheriv(config.server.crypto.algorithm, config.server.crypto.password, config.server.crypto.iv);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }
}

module.exports = EncrypterService;
