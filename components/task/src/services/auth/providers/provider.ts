// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

export class Provider {
  /**
   * Get provider name.
   * @returns {string}
   */
  // @ts-expect-error Intentional override of Function.name to identify this provider.
  static get name(): string {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get tokens.
   * @param {string} code Auth code.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async getTokens(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Renew tokens.
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async renewTokens(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get user info.
   * @param {string} accessToken Access token.
   * @returns {Promise<object>}
   */
  async getUser(_accessToken) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update user info.
   * @param {string} userId User ID.
   * @param {string} accessToken Access token.
   * @param {object} options Update options.
   * @returns {Promise<boolean>}
   */
  async updateUser(..._args: any[]): Promise<any> {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Logout other sessions.
   * @param {string} userId User ID.
   * @param {string} accessToken Access token.
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<boolean>} Is accepted indicator promise.
   */
  async logoutOtherSessions(_userId, _accessToken, _refreshToken) {
    throw new Error(ERROR_OVERRIDE);
  }
}

