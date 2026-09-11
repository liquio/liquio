import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import crypto from 'crypto';

/**
 * Custom OAuth2Strategy that supports PKCE
 */
export class PKCEOAuth2Strategy extends OAuth2Strategy {
  private pkceParams: { codeVerifier: string; codeChallenge: string } | null = null;
  // id_token isn't forwarded to the verify callback by passport-oauth2, so it's
  // stashed here keyed by access token (unique per exchange) and consumed once.
  private idTokensByAccessToken = new Map<string, string>();

  constructor(options: any, verify: any) {
    super(options, verify);
    // Override getOAuthAccessToken to include code_verifier for PKCE
    const self = this;
    const oauth2 = this._oauth2 as any;
    const originalGetOAuthAccessToken = oauth2.getOAuthAccessToken.bind(oauth2);
    oauth2.getOAuthAccessToken = function (code: string, params: any, callback: any) {
      if (self.pkceParams) {
        params = { ...params, code_verifier: self.pkceParams.codeVerifier };
      }
      return originalGetOAuthAccessToken(code, params, (err: any, accessToken: string, refreshToken: string, tokenParams: any) => {
        if (!err && accessToken && tokenParams?.id_token) {
          self.idTokensByAccessToken.set(accessToken, tokenParams.id_token);
        }
        callback(err, accessToken, refreshToken, tokenParams);
      });
    };
  }

  setPKCEParams(pkceParams: { codeVerifier: string; codeChallenge: string }) {
    this.pkceParams = pkceParams;
  }

  /**
   * Returns the id_token captured for a given access token and forgets it.
   */
  consumeIdToken(accessToken: string): string | undefined {
    const idToken = this.idTokensByAccessToken.get(accessToken);
    this.idTokensByAccessToken.delete(accessToken);
    return idToken;
  }

  authorizationParams(options: any) {
    if (this.pkceParams) {
      return {
        ...options,
        code_challenge: this.pkceParams.codeChallenge,
        code_challenge_method: 'S256',
      };
    }
    return options;
  }
}

/**
 * Generate PKCE parameters (code verifier + code challenge)
 */
export function generatePKCEParameters(): { codeVerifier: string; codeChallenge: string } {
  // Generate a random code verifier (43-128 characters of unreserved characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Create code challenge from verifier using S256 method
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}
