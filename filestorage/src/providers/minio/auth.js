const crypto = require('crypto');

/**
 * Auth.
 */
class Auth {
  /**
   * Auth constructor.
   * @param {object} moduleContext Minio module context.
   */
  constructor(moduleContext) {
    // Save params.
    this.moduleContext = moduleContext;
  }

  /**
   * Get tenant auth info.
   * @param {string} filePath file path to sign.
   * @returns {authorization: string, date: string} full auth string and date of sign.
   */
  getAuthInfo({ filePath, contentType, method }) {
    const { bucket, account: { login, password } = {} } = this.moduleContext || {};

    if (!password) throw new Error('MinIO passsword required');

    const resource = `/${bucket}/${filePath}`;
    const date = new Date().toUTCString();

    const messageToSign = [method, '', contentType, date, resource].join('\n');

    const signature = crypto.createHmac('SHA1', password).update(messageToSign).digest('base64');
    const authorization = `AWS ${login}:${signature}`;

    return { authorization, date };
  }
}

// Export.
module.exports = Auth;
