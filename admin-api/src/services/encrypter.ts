import crypto from 'node:crypto';

export class EncrypterService {
  private static singleton: EncrypterService;

  public config: any;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?: any) {
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
    const cipher = crypto.createCipheriv(global.config.server.crypto.algorithm, global.config.server.crypto.password, global.config.server.crypto.iv);
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
    const decipher = crypto.createDecipheriv(global.config.server.crypto.algorithm, global.config.server.crypto.password, global.config.server.crypto.iv);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }
}
