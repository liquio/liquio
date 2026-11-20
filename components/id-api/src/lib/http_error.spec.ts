import { OAuthError } from '@node-oauth/oauth2-server';

import { Errors } from './errors';
import { HttpError, isPublicError, oauthErrorBody, publicError } from './http_error';

describe('publicError', () => {
  it('returns the message of an HttpError below 500', () => {
    expect(publicError(new HttpError(400, 'Invalid request.'))).toBe('Invalid request.');
  });

  it('hides the message of an HttpError with 5xx', () => {
    expect(publicError(new HttpError(500, 'select * from users'))).toBe('Internal server error');
  });

  it('returns messages from Errors.List', () => {
    expect(publicError(new Error(Errors.List.INVALID_TOKEN.message))).toBe(Errors.List.INVALID_TOKEN.message);
  });

  it('returns messages of OAuth errors below 500 only', () => {
    expect(publicError(new OAuthError('Invalid token', { code: 401 }))).toBe('Invalid token');
    expect(publicError(new OAuthError('db down', { code: 500 }))).toBe('Internal server error');
  });

  it('hides messages of plain and database errors and uses the fallback', () => {
    const dbError = Object.assign(new Error('duplicate key value violates unique constraint "users_pkey"'), {
      name: 'SequelizeUniqueConstraintError',
    });
    expect(publicError(dbError)).toBe('Internal server error');
    expect(publicError(new Error('boom'), 'Invalid request.')).toBe('Invalid request.');
    expect(publicError('raw string')).toBe('Internal server error');
    expect(isPublicError(undefined)).toBe(false);
  });
});

describe('oauthErrorBody', () => {
  it('keeps public OAuth errors', () => {
    expect(oauthErrorBody(new OAuthError('Invalid token', { code: 401 }))).toEqual({
      name: 'Error',
      message: 'Invalid token',
      code: 401,
      status: 401,
      statusCode: 401,
    });
  });

  it('never copies properties of the source error', () => {
    const body = oauthErrorBody(Object.assign(new Error('select 1'), { sql: 'select 1', parent: {} }));

    expect(body).toEqual({ name: 'server_error', message: 'Internal server error', code: 500, status: 500, statusCode: 500 });
  });
});
