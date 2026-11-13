import * as jwt from 'jsonwebtoken';

interface AuthConfig {
  jwtSecret: string;
  ttlSeconds?: number;
  jwtOnlyFreshnessSeconds?: number;
  legacyTokensAllowedUntil?: string | number;
  [key: string]: any;
}

interface TokenPayload {
  userId: string;
  authTokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface DecodedToken extends TokenPayload {
  iat?: number;
  exp?: number;
}

const DEFAULT_TTL_SECONDS = 86400; // 24 hours.
const DEFAULT_JWT_ONLY_FRESHNESS_SECONDS = 900; // 15 minutes.

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
  private ttlSeconds: number;
  private jwtOnlyFreshnessSeconds: number;
  private legacyTokensAllowedUntil: number;

  /**
   * Token constructor
   * @param authConfig - Authentication config with jwtSecret
   */
  constructor(authConfig: AuthConfig) {
    if (!Token.singleton) {
      this.config = authConfig;
      this.jwtSecret = authConfig.jwtSecret;
      this.ttlSeconds = Number(authConfig.ttlSeconds) > 0 ? Number(authConfig.ttlSeconds) : DEFAULT_TTL_SECONDS;
      this.jwtOnlyFreshnessSeconds =
        Number(authConfig.jwtOnlyFreshnessSeconds) > 0 ? Number(authConfig.jwtOnlyFreshnessSeconds) : DEFAULT_JWT_ONLY_FRESHNESS_SECONDS;
      // Tokens issued before the TTL rollout have no "exp". Accepted only until this date (ISO string or ms timestamp), if set.
      const legacyUntil = authConfig.legacyTokensAllowedUntil;
      this.legacyTokensAllowedUntil = legacyUntil ? new Date(legacyUntil).getTime() : 0;
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

    return jwt.sign(tokenData, this.jwtSecret, { expiresIn: this.ttlSeconds });
  }

  /**
   * Decrypt and verify JWT token
   * @param token - JWT token to verify
   * @returns Token payload with userId and authTokens
   */
  decrypt(token: string): DecodedToken {
    // Expiration is checked by jwt.verify ("exp" claim).
    const tokenData = jwt.verify(token, this.jwtSecret) as DecodedToken;

    if (typeof tokenData.exp !== 'number' && !(this.legacyTokensAllowedUntil > Date.now())) {
      throw new jwt.JsonWebTokenError('token without expiration is not allowed');
    }

    return tokenData;
  }

  /**
   * Is token fresh enough to be trusted without session check in ID.
   * @param tokenData - Decoded token payload
   * @returns True if issued within the freshness window
   */
  isFresh(tokenData?: { iat?: number }): boolean {
    if (!tokenData || typeof tokenData.iat !== 'number') return false;
    const ageSeconds = Math.floor(Date.now() / 1000) - tokenData.iat;
    return ageSeconds >= 0 && ageSeconds <= this.jwtOnlyFreshnessSeconds;
  }
}

export default Token;
