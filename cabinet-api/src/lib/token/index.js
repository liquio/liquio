const jwt = require('jsonwebtoken');

/**
 * Token.
 */
class Token {
  /**
   * Token constructor.
   * @param {object} authConfig Auth config object.
   */
  constructor(authConfig) {
    // Define singleton.
    if (!Token.singleton) {
      this.config = authConfig;
      this.jwtSecret = authConfig.jwtSecret;
      Token.singleton = this;
    }
    return Token.singleton;
  }

  /**
   * Generate JWT token.
   * @param {{ authTokens: { accessToken: string, refreshToken: string }, authUserInfo: { userId: string } }} userInfo User info.
   * @returns {string} Token.
   */
  generate(userInfo) {
    // Define token data.
    const tokenData = {
      userId: userInfo.authUserInfo.userId,
      authTokens: userInfo.authTokens,
    };

    // Return token.
    const token = jwt.sign(tokenData, this.jwtSecret);
    return token;
  }

  /**
   * Decrypt.
   * @param {string} token Token.
   * @returns {{ userId: string, authTokens: { accessToken: string, refreshToken: string } }} Info from token.
   */
  decrypt(token) {
    // Get token data.
    const tokenData = jwt.verify(token, this.jwtSecret);
    return tokenData;
  }
}

module.exports = Token;
