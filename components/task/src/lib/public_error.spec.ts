import { BadRequestError, HTTPRequestError, InvalidParamsError, NotFoundError, SequelizeDbError } from './errors';
import { getErrorStatus, isPublicError, publicError } from './public_error';

describe('public_error', () => {
  it('treats exposed errors and own client errors as public', () => {
    expect(isPublicError(new BadRequestError('x'))).toBe(true);
    expect(isPublicError(new NotFoundError('x'))).toBe(true);
    expect(isPublicError(new InvalidParamsError('x'))).toBe(true);
    expect(isPublicError(Object.assign(new Error('x'), { status: 413, expose: true }))).toBe(true);
    expect(isPublicError(Object.assign(new Error('x'), { expose: true }))).toBe(true);
    expect(isPublicError(Object.assign(new Error('x'), { name: 'IdApiError', status: 400 }))).toBe(true);
  });

  it('never treats server, library or plain errors as public', () => {
    expect(isPublicError(new Error('SELECT 1'))).toBe(false);
    expect(isPublicError(new SequelizeDbError(new Error('relation "x" does not exist')))).toBe(false);
    expect(isPublicError(new HTTPRequestError('connect ECONNREFUSED'))).toBe(false);
    expect(isPublicError(Object.assign(new Error('x'), { status: 400 }))).toBe(false);
    expect(isPublicError(Object.assign(new Error('x'), { name: 'IdApiError', status: 502 }))).toBe(false);
    expect(
      isPublicError(Object.assign(new SyntaxError('Unexpected token x in JSON'), { status: 400, expose: true, type: 'entity.parse.failed' })),
    ).toBe(false);
    expect(isPublicError(null)).toBe(false);
  });

  it('returns safe messages', () => {
    expect(publicError(new BadRequestError('Bad'), 400, 'Bad')).toBe('Bad');
    expect(publicError(new Error('SELECT 1'), 500, 'SELECT 1')).toBe('Internal server error');
    expect(publicError(new Error('SELECT 1'), 403, 'SELECT 1')).toBe('Forbidden');
  });

  it('reads status only in the 4xx-5xx range', () => {
    expect(getErrorStatus({ status: 'nope' })).toBeUndefined();
    expect(getErrorStatus({ httpStatusCode: 200 })).toBeUndefined();
    expect(getErrorStatus({ statusCode: 413 })).toBe(413);
  });
});
