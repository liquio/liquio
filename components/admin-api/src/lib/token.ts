import jwt from 'jsonwebtoken';

// Default session JWT lifetime. Override with `auth.jwtExpiresIn` (seconds or a vercel/ms string, e.g. "12h").
const DEFAULT_JWT_EXPIRES_IN = '12h';
const JWT_ALGORITHM = 'HS256';

/**
 * Token.
 */
export class Token {
  private static singleton: Token;

  public config: any;
  public jwtSecret: string;
  public jwtExpiresIn: string | number;

  /**
   * Token constructor.
   * @param {object} authConfig Auth config object.
   */
  constructor(authConfig) {
    // Define singleton.
    if (!Token.singleton) {
      this.config = authConfig;
      this.jwtSecret = authConfig.jwtSecret;
      this.jwtExpiresIn = authConfig.jwtExpiresIn || DEFAULT_JWT_EXPIRES_IN;
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
    const token = jwt.sign(tokenData, this.jwtSecret, { expiresIn: this.jwtExpiresIn as any, algorithm: JWT_ALGORITHM });
    return token;
  }

  /**
   * Decrypt.
   * @param {string} token Token.
   * @returns {{ userId: string, authTokens: { accessToken: string, refreshToken: string } }} Info from token.
   */
  decrypt(token) {
    // Get token data.
    const tokenData = jwt.verify(token, this.jwtSecret, {
      algorithms: [JWT_ALGORITHM],
      // Also bounds legacy tokens issued without `exp` (they carry `iat`) to the new lifetime.
      maxAge: this.jwtExpiresIn as any,
    });
    return tokenData;
  }
}
