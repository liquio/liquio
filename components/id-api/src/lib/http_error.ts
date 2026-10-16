import { OAuthError } from '@node-oauth/oauth2-server';

import { Errors } from './errors';

export const GENERIC_ERROR_MESSAGE = 'Internal server error';

export class HttpError extends Error {
  public status: number;
  public details?: Record<string, any>;

  constructor(status: number, message: string) {
    super(message);

    this.status = status;
    this.name = this.constructor.name;
  }

  /**
   * Convert object to string.
   */
  toString(): string {
    return `${this.message}`;
  }
}

/**
 * Whether the error text was written for the client: `HttpError` below 500, OAuth protocol errors below 500
 * and the messages of `Errors.List`. Everything else (Sequelize, axios, runtime errors) carries internal details.
 */
export function isPublicError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof HttpError) return error.status < 500;
  if (error instanceof OAuthError) return Number((error as any).statusCode ?? (error as any).status ?? 500) < 500;
  return !!Errors.getByMessage(error.message);
}

/**
 * Client-visible text for an error: its message when it is public, otherwise the fallback.
 * Strings are treated as already-written messages and returned as is.
 */
export function publicError(error: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string {
  return isPublicError(error) ? (error as Error).message : fallback;
}

/**
 * Body for OAuth error responses. Never spreads the raw error: `new OAuthError(msg, error)` copies own properties
 * of the source error (SQL, parent, original ...) into the response.
 */
export function oauthErrorBody(error: any, fallback: string = GENERIC_ERROR_MESSAGE, hiddenStatus = 500) {
  const isPublic = isPublicError(error);
  const code = isPublic ? Number((error as any).statusCode ?? (error as any).status ?? 400) : hiddenStatus;
  return { name: isPublic ? error.name : 'server_error', message: isPublic ? error.message : fallback, code, status: code, statusCode: code };
}
