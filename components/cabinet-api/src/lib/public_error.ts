import { STATUS_CODES } from 'node:http';

const GENERIC_SERVER_ERROR = 'Internal server error';

/**
 * Checks that an error is safe to show to a client: it has a client-error status (below 500) and is explicitly marked `expose`
 * (http-errors / body-parser convention). Library, axios, JWT and DB errors are never public.
 */
export function isPublicError(error: any): boolean {
  if (!error || typeof error !== 'object' || error.expose !== true) {
    return false;
  }
  const status = Number(error.status ?? error.statusCode);
  return status >= 400 && status < 500;
}

/**
 * Returns a client-safe message: the error message for public errors, otherwise only the HTTP status text.
 */
export function publicError(error: any, status: number): string {
  if (isPublicError(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return status >= 500 ? GENERIC_SERVER_ERROR : STATUS_CODES[status] || 'Error';
}
