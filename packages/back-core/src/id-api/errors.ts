/**
 * Messages of the errors thrown by the id-api client itself (not taken from id-api responses).
 */
export enum IdApiErrorMessage {
  BasicAuthNotConfigured = 'Basic auth is not configured for id-api.',
  TokensNotResponsed = 'Access or refresh tokens not responsed from auth server.',
  UserIdNotResponsed = 'User ID not responsed from auth server.',
  UserNotResponsed = 'User not responsed from auth server.',
  UsersListNotResponsed = 'Users list not responsed from auth server.',
  LoginHistoryNotResponsed = 'Login history not responsed from auth server.',
  UserAdminActionsNotResponsed = 'User admin actions not responsed from auth server.',
  UserStatNotResponsed = 'User stat not responsed from auth server.',
  UserSmsNotResponsed = 'Phone verification not responsed from auth server.',
  UserChangeEmailNotResponsed = 'Change email not responsed from auth server.',
  UserConfirmationChangeEmailNotResponsed = 'Confirmation change email not responsed from auth server.',
  EmailCodeNotConfirmed = 'Email code not confirmed by auth server.',
  EmailExistenceNotResponsed = 'Email existence status not responsed from auth server.',
  WrongResponseFormat = 'Wrong response format.',
  WrongResponseDataFormat = 'Wrong response data format.',
  StatPeriod = "Option 'from' must be less than option 'to'",
  UpdateUserFailed = 'User info was not updated by auth server.',
}

/**
 * Error thrown by the id-api client for non-2xx responses, network failures and timeouts.
 * For HTTP errors the message is the response body (JSON-stringified for objects).
 */
export class IdApiError extends Error {
  public readonly status?: number;
  public readonly body?: any;
  public readonly code?: string;

  /**
   * @param {string} message Error message.
   * @param {object} [details] Error details.
   * @param {number} [details.status] HTTP status.
   * @param {any} [details.body] Parsed response body.
   * @param {string} [details.code] `HTTP_ERROR`, `TIMEOUT` or `NETWORK_ERROR`.
   * @param {unknown} [details.cause] Original error.
   */
  constructor(message: string, details: { status?: number; body?: any; code?: string; cause?: unknown } = {}) {
    super(message);
    this.name = 'IdApiError';
    this.status = details.status;
    this.body = details.body;
    this.code = details.code;
    if (details.cause !== undefined) {
      (this as any).cause = details.cause;
    }
    Object.setPrototypeOf(this, IdApiError.prototype);
  }
}
