/**
 * Messages of the errors thrown by the register-api client itself (not taken from register responses).
 */
export enum RegisterApiErrorMessage {
  NotInitialized = 'Register API client is not initialized. Pass a config on the first call.',
  NoResponseBody = 'Register responded without a body.',
}

export type RegisterApiErrorCode = 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR';

/**
 * Error thrown by the register-api client for non-2xx responses, network failures and timeouts.
 */
export class RegisterApiError extends Error {
  public readonly status?: number;
  public readonly body?: any;
  public readonly code?: RegisterApiErrorCode;
  public readonly details?: any;
  public readonly responseCode?: string | number | null;

  /**
   * @param {string} message Error message.
   * @param {object} [options] Error options.
   * @param {number} [options.status] HTTP status.
   * @param {any} [options.body] Parsed response body.
   * @param {RegisterApiErrorCode} [options.code] `HTTP_ERROR`, `TIMEOUT` or `NETWORK_ERROR`.
   * @param {any} [options.details] `body.error.details` of the register response.
   * @param {string|number|null} [options.responseCode] `body.error.code` of the register response.
   * @param {unknown} [options.cause] Original error.
   */
  constructor(
    message: string,
    {
      status,
      body,
      code,
      details,
      responseCode,
      cause,
    }: {
      status?: number;
      body?: any;
      code?: RegisterApiErrorCode;
      details?: any;
      responseCode?: string | number | null;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'RegisterApiError';
    this.status = status;
    this.body = body;
    this.code = code;
    this.details = details;
    this.responseCode = responseCode;
    if (cause !== undefined) {
      (this as any).cause = cause;
    }
    Object.setPrototypeOf(this, RegisterApiError.prototype);
  }
}
