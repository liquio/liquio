import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, fetchMock, getState } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  fetchMock: vi.fn(),
  getState: vi.fn(),
}));

vi.mock('helpers/configLoader', () => ({ getConfig }));
vi.mock('isomorphic-fetch', () => ({ default: fetchMock }));
vi.mock('store', () => ({ default: { getState } }));

type Api = typeof import('./index');
type Action = { type: string; [key: string]: unknown };

// The module keeps the API url and a retry counter at module level, so every test gets a fresh one.
const freshApi = async (): Promise<Api> => {
  vi.resetModules();
  return import('./index');
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('services/api', () => {
  let dispatch: ReturnType<typeof vi.fn<(action: Action) => unknown>>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  const dispatched = (): string[] => dispatch.mock.calls.map(([action]) => action.type);

  beforeEach(() => {
    dispatch = vi.fn();
    getConfig.mockReturnValue({ BACKEND_URL: 'http://api.test', APP_ENV: 'test' });
    getState.mockReturnValue({ auth: {}, eds: {} });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fetchMock.mockReset();
    getConfig.mockReset();
    getState.mockReset();
  });

  describe('API_URL', () => {
    it('appends a slash to BACKEND_URL', async () => {
      const { API_URL } = await freshApi();
      expect(API_URL()).toBe('http://api.test/');
    });

    it('keeps an existing trailing slash', async () => {
      getConfig.mockReturnValue({ BACKEND_URL: '/' });
      const { API_URL } = await freshApi();
      expect(API_URL()).toBe('/');
    });

    it('is computed once and then cached', async () => {
      const { API_URL } = await freshApi();
      API_URL();
      getConfig.mockReturnValue({ BACKEND_URL: 'http://other' });
      expect(API_URL()).toBe('http://api.test/');
    });

    it('throws when BACKEND_URL is not configured', async () => {
      getConfig.mockReturnValue({});
      const { API_URL } = await freshApi();
      expect(() => API_URL()).toThrow(TypeError);
    });
  });

  describe('get', () => {
    it('dispatches LOADING, requests the url with the headers and dispatches SUCCESS', async () => {
      fetchMock.mockResolvedValue(json({ data: { name: 'x' } }));
      const { get } = await freshApi();

      const result = await get('auth', 'GET_AUTH', dispatch);

      expect(result).toEqual({ name: 'x' });
      expect(dispatched()).toEqual(['GET_AUTH_LOADING', 'GET_AUTH_SUCCESS']);
      expect(dispatch.mock.calls[0][0]).toEqual({
        type: 'GET_AUTH_LOADING',
        payload: {},
        body: undefined,
        url: 'http://api.test/auth',
        method: 'get',
      });
      expect(dispatch.mock.calls[1][0]).toEqual({
        type: 'GET_AUTH_SUCCESS',
        payload: { name: 'x' },
        url: 'http://api.test/auth',
        method: 'get',
        body: undefined,
      });

      const [url, config] = fetchMock.mock.calls[0];
      expect(url).toBe('http://api.test/auth');
      expect(config.method).toBe('get');
      expect(config.credentials).toBe('include');
      expect(config.url).toBeUndefined();
      expect(config.headers.get('content-type')).toBe('application/json');
      expect(config.headers.get('access-control-request-method')).toBe('get');
    });

    it('sends the token header as the string "undefined" (preserved bug: state.authorization does not exist)', async () => {
      fetchMock.mockResolvedValue(json({}));
      getState.mockReturnValue({ auth: { token: 'real' }, eds: {} });
      const { get } = await freshApi();

      await get('auth', 'GET_AUTH', dispatch);

      expect(fetchMock.mock.calls[0][1].headers.get('token')).toBe('undefined');
    });

    it('uses a token stored under `authorization` when there is one', async () => {
      fetchMock.mockResolvedValue(json({}));
      getState.mockReturnValue({ authorization: { token: 'abc' } });
      const { get } = await freshApi();

      await get('auth', 'GET_AUTH', dispatch);

      expect(fetchMock.mock.calls[0][1].headers.get('token')).toBe('abc');
    });
  });

  describe('response parsing', () => {
    it('returns body.data when there is no meta', async () => {
      fetchMock.mockResolvedValue(json({ data: { a: 1 } }));
      const { get } = await freshApi();
      expect(await get('x', 'A', dispatch)).toEqual({ a: 1 });
    });

    it('returns the body itself when it has no data', async () => {
      fetchMock.mockResolvedValue(json({ a: 1 }));
      const { get } = await freshApi();
      expect(await get('x', 'A', dispatch)).toEqual({ a: 1 });
    });

    it('moves body.meta into data when the body has meta', async () => {
      fetchMock.mockResolvedValue(json({ data: { a: 1 }, meta: { total: 2 } }));
      const { get } = await freshApi();
      expect(await get('x', 'A', dispatch)).toEqual({ a: 1, meta: { total: 2 } });
    });

    it('unwraps data.result and attaches the meta to it', async () => {
      fetchMock.mockResolvedValue(json({ data: { result: { r: 1 } }, meta: { total: 5 } }));
      const { get } = await freshApi();
      expect(await get('x', 'A', dispatch)).toEqual({ r: 1, meta: { total: 5 } });
    });

    it('returns text for text/html', async () => {
      fetchMock.mockResolvedValue(new Response('<p>hi</p>', { headers: { 'content-type': 'text/html; charset=utf-8' } }));
      const { get } = await freshApi();
      expect(await get('x', 'A', dispatch)).toBe('<p>hi</p>');
    });

    it('returns a blob for other content types', async () => {
      fetchMock.mockResolvedValue(new Response('abc', { headers: { 'content-type': 'application/pdf' } }));
      const { get } = await freshApi();
      const result = await get('x', 'A', dispatch);
      expect(result).toBeInstanceOf(Blob);
      expect((result as Blob).size).toBe(3);
      expect((result as Blob).type).toBe('application/pdf');
    });

    it('turns a response without a Content-Type header into a TypeError (preserved bug)', async () => {
      const bare = new Response(null, { status: 204 });
      bare.headers.delete('content-type');
      fetchMock.mockResolvedValue(bare);
      const { get } = await freshApi();

      const result = await get('x', 'A', dispatch);

      expect(result).toBeInstanceOf(TypeError);
      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL']);
    });

    it('treats an `error` field in a successful body as a failure', async () => {
      fetchMock.mockResolvedValue(json({ error: { message: 'Denied' }, code: 5 }));
      const { get } = await freshApi();

      const result = (await get('x', 'A', dispatch)) as Error & { code?: number };

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Denied');
      expect(result.code).toBe(5);
      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL']);
    });
  });

  describe('failed responses', () => {
    it('resolves with an error built from a JSON `error` field (the promise does not reject)', async () => {
      fetchMock.mockResolvedValue(json({ error: 'Invalid code', details: [1] }, { status: 400, statusText: 'Bad Request' }));
      const { post } = await freshApi();

      const result = (await post('x', { a: 1 }, 'A', dispatch)) as Error & Record<string, unknown>;

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Invalid code');
      expect(result.status).toBe(400);
      expect(result.details).toEqual([1]);
      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL']);
      expect(dispatch.mock.calls[1][0].payload).toBe(result);
      expect(consoleError).toHaveBeenCalledWith('API Exception:', expect.objectContaining({ url: 'http://api.test/x' }));
    });

    it('reads the error text from `detail` too', async () => {
      fetchMock.mockResolvedValue(json({ detail: 'Nope' }, { status: 422 }));
      const { get } = await freshApi();
      expect(((await get('x', 'A', dispatch)) as Error).message).toBe('Nope');
    });

    it('does not pass the request to checkError (preserved bug), so it is not copied onto the error', async () => {
      fetchMock.mockResolvedValue(json({ error: 'Bad' }, { status: 400 }));
      const { post } = await freshApi();

      const result = (await post('x', { a: 1 }, 'A', dispatch)) as Record<string, unknown>;

      expect(result.method).toBeUndefined();
      expect(result.credentials).toBeUndefined();
    });

    it('replaces the fixed 503 message with the server message, so a plain 503 does not dispatch ERROR_503 (preserved)', async () => {
      fetchMock.mockResolvedValue(
        new Response('down', { status: 503, statusText: 'Service Unavailable', headers: { 'content-type': 'text/plain' } }),
      );
      const { get } = await freshApi();

      const result = (await get('x', 'A', dispatch)) as Error;

      // checkError builds 'API: 503 Service Unavailable', but responseFail then swaps in serverMessage
      // (the status text), which no longer contains '503'.
      expect(result.message).toBe('Service Unavailable');
      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL']);
    });

    it('dispatches ERROR_503 when the final message mentions 503', async () => {
      fetchMock.mockResolvedValue(json({ error: 'HTTP 503 upstream' }, { status: 502 }));
      const { get } = await freshApi();

      await get('x', 'A', dispatch);

      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL', 'ERROR_503']);
      expect(dispatch.mock.calls[2][0].payload).toBe(true);
    });

    it('dispatches DB_ERROR for an ORA message', async () => {
      fetchMock.mockResolvedValue(json({ error: 'ORA-00001 unique constraint' }, { status: 500 }));
      const { get } = await freshApi();

      await get('x', 'A', dispatch);

      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL', 'DB_ERROR']);
    });

    it('does not dispatch DB_ERROR for an ORA message that mentions ADD_FILEDOC', async () => {
      fetchMock.mockResolvedValue(json({ error: 'ORA-1 ADD_FILEDOC failed' }, { status: 500 }));
      const { get } = await freshApi();

      await get('x', 'A', dispatch);

      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL']);
    });
  });

  describe('network errors', () => {
    it('retries a "Failed to fetch" error and resolves with the next response', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(json({ data: { ok: true } }));
      const { get } = await freshApi();

      const result = await get('x', 'A', dispatch);

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(dispatched()).toEqual(['A_LOADING', 'A_FAIL', 'A_LOADING', 'A_SUCCESS']);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('gives up after 16 retries and resolves with the error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const { get } = await freshApi();

      const result = await get('x', 'A', dispatch);

      expect(fetchMock).toHaveBeenCalledTimes(17);
      expect(result).toBeInstanceOf(TypeError);
      expect((result as Error).message).toBe('Failed to fetch');
      expect(consoleError).toHaveBeenCalledTimes(1);
    });

    it('does not retry other network errors', async () => {
      fetchMock.mockRejectedValue(new Error('boom'));
      const { get } = await freshApi();

      const result = await get('x', 'A', dispatch);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect((result as Error).message).toBe('boom');
    });

    it('resets the retry counter after a final failure', async () => {
      fetchMock.mockRejectedValue(new Error('boom'));
      const { get } = await freshApi();
      await get('x', 'A', dispatch);

      fetchMock.mockReset();
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await get('x', 'A', dispatch);

      expect(fetchMock).toHaveBeenCalledTimes(17);
    });
  });

  describe('request builders', () => {
    it('post sends a JSON body and passes the payload to LOADING', async () => {
      fetchMock.mockResolvedValue(json({ data: {} }));
      const { post } = await freshApi();

      await post('users/phone/send_sms', { phone: '1' }, 'SEND', dispatch);

      const [url, config] = fetchMock.mock.calls[0];
      expect(url).toBe('http://api.test/users/phone/send_sms');
      expect(config.method).toBe('post');
      expect(config.body).toBe('{"phone":"1"}');
      expect(dispatch.mock.calls[0][0]).toMatchObject({ type: 'SEND_LOADING', payload: { phone: '1' }, body: '{"phone":"1"}' });
      expect(dispatch.mock.calls[1][0]).toMatchObject({ type: 'SEND_SUCCESS', body: '{"phone":"1"}' });
    });

    it('put sends a JSON body with the put method', async () => {
      fetchMock.mockResolvedValue(json({ data: {} }));
      const { put } = await freshApi();

      await put('users/email/change', { email: 'a@b' }, 'CH', dispatch);

      expect(fetchMock.mock.calls[0][1].method).toBe('put');
      expect(fetchMock.mock.calls[0][1].body).toBe('{"email":"a@b"}');
    });

    it('del sends a delete request without a body', async () => {
      fetchMock.mockResolvedValue(json({ data: {} }));
      const { del } = await freshApi();

      await del('thing/1', 'DEL', dispatch);

      expect(fetchMock.mock.calls[0][1].method).toBe('delete');
      expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    });

    it('upload posts the file with its own content type and the params in the query string', async () => {
      fetchMock.mockResolvedValue(json({ data: {} }));
      const { upload } = await freshApi();
      const file = new Blob(['abc'], { type: 'image/png' });

      await upload('files', file, { name: 'a', n: 2 }, 'UP', dispatch);

      const [url, config] = fetchMock.mock.calls[0];
      expect(url).toBe('http://api.test/files?name=a&n=2');
      expect(config.method).toBe('post');
      expect(config.body).toBe(file);
      expect(config.headers.get('content-type')).toBe('image/png');
      expect(dispatch.mock.calls[0][0].payload).toBe(file);
    });
  });
});
