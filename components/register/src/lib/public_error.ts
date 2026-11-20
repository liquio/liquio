import { STATUS_CODES } from 'node:http';

const GENERIC_SERVER_ERROR = 'Internal server error';

/**
 * Error with a message that is intended for the client. Its status is not changed:
 * the controller still uses the status it passes to `responseError`.
 */
export class PublicError extends Error {
  public isPublic = true;

  constructor(message?: string) {
    super(message);
    this.name = 'PublicError';
  }
}

/**
 * Checks that an error message is safe to show to a client: the error is marked `isPublic`
 * or is an `expose` client error (http-errors / body-parser convention, status below 500).
 * Library, axios, DB and unmarked errors are never public.
 */
export function isPublicError(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  if (error.isPublic === true) {
    return true;
  }
  if (error.expose === true) {
    const status = Number(error.status ?? error.statusCode);
    return status >= 400 && status < 500;
  }
  return false;
}

/**
 * Returns a client-safe message: the error message for public errors, otherwise only the HTTP status text
 * (4xx) or a generic text (5xx and unknown statuses).
 */
export function publicError(error: any, status: number): string {
  if (isPublicError(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return status >= 500 || !STATUS_CODES[status] ? GENERIC_SERVER_ERROR : STATUS_CODES[status];
}
