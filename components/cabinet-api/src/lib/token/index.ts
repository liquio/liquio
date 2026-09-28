import * as jwt from 'jsonwebtoken';

interface AuthConfig {
  jwtSecret: string;
  [key: string]: any;
}

interface TokenPayload {
  userId: string;
  authTokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface UserTokenInfo {
  authUserInfo: {
    userId: string;
  };
  authTokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * JWT token manager (singleton)
 */
class Token {
  private static singleton: Token;
  private config: AuthConfig;
  private jwtSecret: string;

  /**
   * Token constructor
   * @param authConfig - Authentication config with jwtSecret
   */
  constructor(authConfig: AuthConfig) {
    if (!Token.singleton) {
      this.config = authConfig;
      this.jwtSecret = authConfig.jwtSecret;
      Token.singleton = this;
    }
    return Token.singleton;
  }

  /**
   * Generate JWT token from user info
   * @param userInfo - User info with tokens and userId
   * @returns JWT token string
   */
  generate(userInfo: UserTokenInfo): string {
    const tokenData: TokenPayload = {
      userId: userInfo.authUserInfo.userId,
      authTokens: userInfo.authTokens,
    };

    return jwt.sign(tokenData, this.jwtSecret);
  }

  /**
   * Decrypt and verify JWT token
   * @param token - JWT token to verify
   * @returns Token payload with userId and authTokens
   */
  decrypt(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }
}

export default Token;
