import { STATUS_CODES } from 'node:http';

import { ErrorWithHttpStatusCode } from './errors';

const GENERIC_SERVER_ERROR = 'Internal server error';

/**
 * Error with a message that is intended for the client. Its status is not changed:
 * the controller still uses `httpStatusCode` (500 by default).
 */
export class PublicError extends Error {
  public isPublic = true;
  public httpStatusCode?: number;
  public details?: any;

  constructor(message?: string, httpStatusCode?: number) {
    super(message);
    this.name = 'PublicError';
    if (httpStatusCode) {
      this.httpStatusCode = httpStatusCode;
    }
  }
}

/**
 * Checks that an error message is safe to show to a client: the error is marked `isPublic` (PublicError and the
 * component's exceptions), is one of the component's HTTP errors with a client status (below 500) or is an
 * `expose` client error (http-errors / body-parser convention). Library, axios, DB and unmarked errors are never public.
 */
export function isPublicError(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  if (error.isPublic === true) {
    return true;
  }
  if (error instanceof ErrorWithHttpStatusCode) {
    return Number(error.httpStatusCode) < 500;
  }
  if (error.expose === true) {
    const status = Number(error.status ?? error.statusCode);
    return status >= 400 && status < 500;
  }
  return false;
}

/**
 * Returns a client-safe message: the error message for public errors, otherwise only the HTTP status text.
 */
export function publicError(error: any, status: number): string {
  if (isPublicError(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return status >= 500 || !STATUS_CODES[status] ? GENERIC_SERVER_ERROR : STATUS_CODES[status];
}
