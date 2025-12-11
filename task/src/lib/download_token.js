
const jwt = require('jsonwebtoken');

// Constants.
const DEFAULT_CONFIG = {
  lifetimeInSeconds: 3600
};

/**
 * Download token.
 */
class DownloadToken {
  /**
   * Download token constructor.
   * @param {{ jwtSecret: string, lifetimeInSeconds: number }} [downloadTokenConfig] Download token config.
   */
  constructor(downloadTokenConfig = {}) {
    // Define singleton.
    if (!DownloadToken.singleton) {
      const { jwtSecret, lifetimeInSeconds } = { ...DEFAULT_CONFIG, ...downloadTokenConfig };

      if (!jwtSecret) {
        throw new Error('JWT secret is required to create download token.');
      }

      this.jwtSecret = jwtSecret;
      this.lifetimeInSeconds = lifetimeInSeconds;
      DownloadToken.singleton = this;
    }
    return DownloadToken.singleton;
  }

  /**
   * Generate JWT download token.
   * @param {string} fileId File ID.
   * @returns {string} Download token.
   */
  generate(fileId) {
    // Define token data.
    const tokenData = { fileId };

    // Return token.
    const token = jwt.sign(tokenData, this.jwtSecret, { expiresIn: this.lifetimeInSeconds });
    return token;
  }

  /**
   * Decrypt JWT download token.
   * @param {string} token Download token.
   * @returns {string} File ID.
   */
  decrypt(token) {
    // Get token data.
    const tokenData = jwt.verify(token, this.jwtSecret);
    const { fileId } = tokenData;
    return fileId;
  }
}

module.exports = DownloadToken;
