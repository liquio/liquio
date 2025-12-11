// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

class Provider {
  /**
   * Get provider name.
   * @returns {string}
   */
  static get name() {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get tokens.
   * @param {string} code Auth code.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async getTokens() {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Renew tokens.
   * @param {string} refreshToken Refresh token.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async renewTokens() {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get user info.
   * @param {string} accessToken Access token.
   * @returns {Promise<object>}
   */
  /* eslint-disable-next-line no-unused-vars */
  async getUser(accessToken) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update user info.
   * @param {string} userId User ID.
   * @param {string} accessToken Access token.
   * @param {object} options Update options.
   * @returns {Promise<boolean>}
   */
  async updateUser() {
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

module.exports = Provider;
