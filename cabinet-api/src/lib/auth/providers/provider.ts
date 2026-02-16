/**
 * Abstract auth provider base class
 */
export default abstract class Provider {
  /**
   * Get provider name (should be overridden by subclasses).
   */
  getName(): string {
    throw new Error('Method must be override.');
  }

  /**
   * Get tokens from auth code.
   * @param code - Auth code
   * @returns Promise with tokens
   */
  abstract getTokens(code: string): Promise<{ accessToken: string; refreshToken: string }>;

  /**
   * Renew tokens.
   * @param refreshToken - Refresh token
   * @returns Promise with new tokens
   */
  abstract renewTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;

  /**
   * Get user info.
   * @param accessToken - Access token
   * @returns Promise with user info object
   */
  abstract getUser(accessToken: string): Promise<Record<string, unknown>>;

  /**
   * Update user info.
   * @param userId - User ID
   * @param accessToken - Access token
   * @param options - Update options
   * @returns Promise with update success status
   */
  abstract updateUser(userId: string, accessToken: string, options: Record<string, unknown>): Promise<boolean>;

  /**
   * Logout other sessions.
   * @param userId - User ID
   * @param accessToken - Access token
   * @param refreshToken - Refresh token
   * @returns Promise with logout acceptance status
   */
  abstract logoutOtherSessions(userId: string, accessToken: string, refreshToken: string): Promise<boolean>;
}
