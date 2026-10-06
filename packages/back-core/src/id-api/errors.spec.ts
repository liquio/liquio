import { IdApiError } from './errors';

describe('IdApiError', () => {
  it('is an Error with the id-api details', () => {
    const cause = new Error('root');

    const error = new IdApiError('failed', { status: 500, body: { a: 1 }, code: 'HTTP_ERROR', cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IdApiError);
    expect(error.name).toBe('IdApiError');
    expect(error.message).toBe('failed');
    expect(error.status).toBe(500);
    expect(error.body).toEqual({ a: 1 });
    expect(error.code).toBe('HTTP_ERROR');
    expect((error as any).cause).toBe(cause);
  });

  it('works without details', () => {
    const error = new IdApiError('failed');

    expect(error.status).toBeUndefined();
    expect(error.body).toBeUndefined();
    expect(error.code).toBeUndefined();
    expect((error as any).cause).toBeUndefined();
  });
});
