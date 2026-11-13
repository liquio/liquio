import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';

// Constants.
const DEFAULT_JWT_OPTIONS = {
  expiresIn: '1d',
};

/**
 * Token.
 */
export class Token {
  private static singleton: Token;

  config: any;
  jwtOptions: any;
  jwtSecret: any;

  /**
   * Token constructor.
   * @param {object} authConfig Auth config object.
   */
  constructor(authConfig) {
    // Define singleton.
    if (!Token.singleton) {
      this.config = authConfig;
      this.jwtSecret = authConfig.jwtSecret;
      this.jwtOptions = authConfig.jwtOptions || DEFAULT_JWT_OPTIONS;
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
    const token = jwt.sign(tokenData, this.jwtSecret, this.jwtOptions);
    return token;
  }

  /**
   * Generate Bearer JWT token.
   * @param {{ authTokens: { accessToken: string, refreshToken: string }, authUserInfo: { userId: string } }} userInfo User info.
   * @returns {string} Token.
   */
  generateBearer(userInfo) {
    // Define token data.
    const tokenData = {
      user: userInfo,
    };

    // Bearer tokens are not renewable: lifetime is fixed at issue time. Optional `bearer.maxAgeSeconds` overrides the default lifetime.
    const maxAgeSeconds = Number(this.config?.bearer?.maxAgeSeconds);
    const options = {
      ...this.jwtOptions,
      ...(maxAgeSeconds > 0 ? { expiresIn: maxAgeSeconds } : {}),
      jwtid: randomUUID(),
    };

    // Return token.
    const token = jwt.sign(tokenData, this.jwtSecret, options);
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
