import { STATUS_CODES } from 'node:http';

export const GENERIC_SERVER_ERROR = 'Internal server error';

/**
 * Gets HTTP status of an error (component errors use `httpStatusCode`, http-errors/body-parser use `status`).
 */
export function getErrorStatus(error: any): number | undefined {
  const status = Number(error?.httpStatusCode ?? error?.status ?? error?.statusCode);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : undefined;
}

/**
 * Checks that an error is safe to show to a client: it is explicitly marked `expose` (http-errors / body-parser convention,
 * or set by code for an intentional error), or it is a client error (status below 500) raised by the component's own error classes.
 * Library, DB, upstream and plain `Error` instances are never public.
 */
export function isPublicError(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  // Parser errors echo a fragment of the request body.
  if (error.type === 'entity.parse.failed') {
    return false;
  }
  if (error.expose === true) {
    return true;
  }
  const status = getErrorStatus(error);
  // Id-api client errors: id-api already returns only intentional messages for its 4xx answers.
  if (error.name === 'IdApiError') {
    return status !== undefined && status < 500;
  }
  return status !== undefined && status < 500 && error.httpStatusCode !== undefined;
}

/**
 * Returns a client-safe message: `message` for public errors, otherwise a generic text (5xx) or only the HTTP status text (4xx).
 */
export function publicError(error: any, status: number, publicMessage?: string): string {
  if (isPublicError(error) && typeof publicMessage === 'string' && publicMessage) {
    return publicMessage;
  }
  return status >= 500 ? GENERIC_SERVER_ERROR : STATUS_CODES[status] || 'Error';
}
