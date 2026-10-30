import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import logException, { checkError } from './ApiException';
import type { ApiError } from './ApiException';

const { getConfig } = vi.hoisted(() => ({ getConfig: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig }));

const asError = (value: ApiError | false): ApiError => {
  if (!value) throw new Error('expected an error');
  return value;
};

describe('ApiException', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getConfig.mockReturnValue({ APP_ENV: 'test' });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    getConfig.mockReset();
  });

  it('logs the exception with the environment', async () => {
    const error = new Error('x');
    await logException(error, 'u', 'get', undefined);
    expect(consoleError).toHaveBeenCalledWith('API Exception:', {
      error,
      url: 'u',
      method: 'get',
      body: undefined,
      environment: 'test',
    });
  });

  describe('checkError', () => {
    it('returns false when there is no message, status text or known status', () => {
      expect(checkError({})).toBe(false);
    });

    it('wraps a string message in an API error and keeps the server message', () => {
      const error = asError(checkError({ message: 'Boom' }));
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('API: Boom');
      expect(error.serverMessage).toBe('Boom');
    });

    it('uses the nested message of an object message', () => {
      const error = asError(checkError({ message: { message: 'Nested' } }));
      expect(error.message).toBe('API: Nested');
      expect(error.serverMessage).toBe('Nested');
    });

    it('falls back to statusText', () => {
      expect(asError(checkError({ statusText: 'Bad Request', status: 400 })).message).toBe('API: Bad Request');
    });

    it('uses the fixed message for 401', () => {
      expect(asError(checkError({ status: 401, message: 'ignored' })).message).toBe('API: 401 Unauthorized');
    });

    it('uses the fixed message for 403', () => {
      expect(asError(checkError({ status: 403 })).message).toBe('API: 403 Forbidden');
    });

    it('uses the fixed message for 404', () => {
      expect(asError(checkError({ status: 404 })).message).toBe('API: 404 Not Found');
    });

    it('uses the fixed message for 503 and keeps the server message separately', () => {
      const error = asError(checkError({ status: 503, message: 'down' }));
      expect(error.message).toBe('API: 503 Service Unavailable');
      expect(error.serverMessage).toBe('down');
    });

    it('uses the fixed message for 504', () => {
      expect(asError(checkError({ status: 504 })).message).toBe('API: 504 Gateway Timeout');
    });

    it('reuses an Error response, rewriting its message', () => {
      const source = new Error('original');
      const error = asError(checkError(source));
      expect(error).toBe(source);
      expect(error.message).toBe('API: original');
    });

    it('reuses an Error held in response.message', () => {
      const inner = new Error('inner');
      const error = asError(checkError({ message: inner }));
      expect(error).toBe(inner);
      expect(error.message).toBe('API: inner');
    });

    it('copies primitive response and request fields onto the error', () => {
      const error = asError(
        checkError({ message: 'm', code: 7, headers: 'skip' }, { url: 'u', method: 'post', message: 'skip' }),
      );
      expect(error.code).toBe(7);
      expect(error.url).toBe('u');
      expect(error.method).toBe('post');
      expect(error.headers).toBeUndefined();
    });

    it('copies an object request field and flattens it into "key-field" properties', () => {
      const error = asError(checkError({ message: 'm' }, { body: { a: 1 } }));
      expect(error.body).toEqual({ a: 1 });
      expect(error['body-a']).toBe(1);
    });

    it('flattens an object field that already exists on the error', () => {
      const source = Object.assign(new Error('e'), { extra: { k: 'v' } });
      const error = asError(checkError(source));
      expect(error['extra-k']).toBe('v');
    });

    it('throws a TypeError for a null field on the error (preserved bug: typeof null is object)', () => {
      expect(() => checkError({ message: 'm', field: null })).toThrow(TypeError);
    });

    it('copies status from the response when it is not an own property', () => {
      const proto = { status: 418 };
      const response = Object.create(proto, { message: { value: 'teapot', enumerable: true } });
      expect(asError(checkError(response)).status).toBe(418);
    });
  });
});
