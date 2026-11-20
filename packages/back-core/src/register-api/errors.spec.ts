import { RegisterApiError, RegisterApiErrorMessage } from './errors';

describe('RegisterApiError', () => {
  it('is an Error with the register-api details', () => {
    const cause = new Error('root');

    const error = new RegisterApiError('failed', {
      status: 404,
      body: { a: 1 },
      code: 'HTTP_ERROR',
      details: { field: 'x' },
      responseCode: 'NOT_FOUND',
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RegisterApiError);
    expect(error.name).toBe('RegisterApiError');
    expect(error.message).toBe('failed');
    expect(error.status).toBe(404);
    expect(error.body).toEqual({ a: 1 });
    expect(error.code).toBe('HTTP_ERROR');
    expect(error.details).toEqual({ field: 'x' });
    expect(error.responseCode).toBe('NOT_FOUND');
    expect((error as any).cause).toBe(cause);
  });

  it('works without details', () => {
    const error = new RegisterApiError('failed');

    expect(error.status).toBeUndefined();
    expect(error.body).toBeUndefined();
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
    expect(error.responseCode).toBeUndefined();
    expect((error as any).cause).toBeUndefined();
  });

  it('has the error messages', () => {
    expect(RegisterApiErrorMessage.NotInitialized).toContain('not initialized');
    expect(RegisterApiErrorMessage.NoResponseBody).toContain('without a body');
  });
});
