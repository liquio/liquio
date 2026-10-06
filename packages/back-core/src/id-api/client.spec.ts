import { IdApiClient, ID_API_DEFAULT_ROUTES } from './client';
import { IdApiError } from './errors';
import { IdApiConfig } from './types';
import { runInAsyncLocalStorage } from '../common/async_local_storage';

const BASIC_TOKEN = Buffer.from('user:pass').toString('base64');

const baseConfig: IdApiConfig = {
  server: 'http://id.test',
  port: 8100,
  clientId: 'client-1',
  clientSecret: 'secret-1',
  basicAuthToken: BASIC_TOKEN,
  timeout: 1234,
};

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

function mockResponse(status: number, body: unknown, headers: Record<string, string> = {}): void {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  (global.fetch as jest.Mock).mockResolvedValueOnce(new Response(text, { status, headers }));
}

function lastCall(): Call {
  const mock = global.fetch as jest.Mock;
  const [url, init] = mock.mock.calls[mock.mock.calls.length - 1];
  return { url, ...init };
}

describe('IdApiClient', () => {
  let client: IdApiClient;
  let log: { save: jest.Mock };

  beforeEach(() => {
    global.fetch = jest.fn();
    log = { save: jest.fn() };
    client = new IdApiClient({ ...baseConfig, getLog: () => log });
  });

  describe('config defaults', () => {
    it('uses http://id-api:8100, 30s timeout and default routes without config', () => {
      const defaults = new IdApiClient();

      expect(defaults.baseUrl).toBe('http://id-api:8100');
      expect(defaults.timeout).toBe(30000);
      expect(defaults.routes).toEqual(ID_API_DEFAULT_ROUTES);
      expect(defaults.canDeleteUser).toBe(true);
    });

    it('does not append a port when only the server is given', () => {
      expect(new IdApiClient({ server: 'http://id-api:9000' }).baseUrl).toBe('http://id-api:9000');
    });

    it('appends the port when both server and port are given', () => {
      expect(new IdApiClient({ server: 'http://id.test', port: 81 }).baseUrl).toBe('http://id.test:81');
    });

    it('merges route overrides over defaults', () => {
      const custom = new IdApiClient({ routes: { getUserInfo: '/custom/info' } });

      expect(custom.routes.getUserInfo).toBe('/custom/info');
      expect(custom.routes.getToken).toBe('/oauth/token/');
    });

    it('applies the configured timeout as an abort signal', async () => {
      const spy = jest.spyOn(AbortSignal, 'timeout');
      mockResponse(200, { userId: 'u1', services: {} });

      await client.getUser('t');

      expect(spy).toHaveBeenCalledWith(1234);
      spy.mockRestore();
    });

    it('builds the basic header from a token', async () => {
      mockResponse(200, { isExist: true });
      await client.checkEmail('a@b.c');
      expect(lastCall().headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('keeps a token that already has the Basic prefix', async () => {
      const prefixed = new IdApiClient({ ...baseConfig, basicAuthToken: `Basic ${BASIC_TOKEN}` });
      mockResponse(200, { isExist: true });
      await prefixed.checkEmail('a@b.c');
      expect(lastCall().headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('builds the basic header from user and password', async () => {
      const byUser = new IdApiClient({ server: 'http://id.test', basicAuthUser: 'user', basicAuthPassword: 'pass' });
      mockResponse(200, { isExist: true });
      await byUser.checkEmail('a@b.c');
      expect(lastCall().headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('rejects basic auth methods when no credentials are configured', async () => {
      const noAuth = new IdApiClient({ server: 'http://id.test' });

      await expect(noAuth.checkEmail('a@b.c')).rejects.toMatchObject({ code: 'BASIC_AUTH_NOT_CONFIGURED' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('falls back to global.log when getLog is not set', async () => {
      const globalLog = { save: jest.fn() };
      (global as any).log = globalLog;
      const noLog = new IdApiClient(baseConfig);
      mockResponse(200, { userId: 'u1' });

      await noLog.getUser('t');

      expect(globalLog.save).toHaveBeenCalledWith('login-error-id-response-without-user-eds-pem', { userId: 'u1' }, undefined);
      delete (global as any).log;
    });

    it('does not fail when logging throws', async () => {
      const broken = new IdApiClient({
        ...baseConfig,
        getLog: () => {
          throw new Error('log failed');
        },
      });
      mockResponse(200, { userId: 'u1', services: {} });

      await expect(broken.getUser('t')).resolves.toMatchObject({ userId: 'u1' });
    });
  });

  describe('transport', () => {
    it('sends the trace id header when a trace is active', async () => {
      mockResponse(200, { userId: 'u1', services: {} });

      await new Promise<void>((resolve, reject) => {
        runInAsyncLocalStorage(() => {
          client.getUser('t').then(() => resolve(), reject);
        });
      });

      expect(lastCall().headers['x-trace-id']).toEqual(expect.any(String));
    });

    it('omits the trace id header outside of a trace', async () => {
      mockResponse(200, { userId: 'u1', services: {} });
      await client.getUser('t');
      expect(lastCall().headers['x-trace-id']).toBeUndefined();
    });

    it('throws IdApiError with status and parsed body for a non-2xx JSON response', async () => {
      mockResponse(401, { error: 'nope' });

      const error = await client.getUser('t').catch((e) => e);

      expect(error).toBeInstanceOf(IdApiError);
      expect(error.status).toBe(401);
      expect(error.body).toEqual({ error: 'nope' });
      expect(error.code).toBe('HTTP_ERROR');
      expect(error.message).toBe('{"error":"nope"}');
    });

    it('uses a plain text body as the error message', async () => {
      mockResponse(404, 'User not found');
      await expect(client.getUserInfoByPhone('1')).rejects.toThrow('User not found');
    });

    it('uses a generic message for an empty error body', async () => {
      mockResponse(500, '');
      await expect(client.getUserInfoByPhone('1')).rejects.toThrow('Id-api responded with status 500.');
    });

    it('maps a timeout to IdApiError with the TIMEOUT code', async () => {
      const timeout = new Error('aborted');
      timeout.name = 'TimeoutError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(timeout);

      await expect(client.getUser('t')).rejects.toMatchObject({ code: 'TIMEOUT', message: 'Id-api request timed out after 1234ms.' });
    });

    it('maps a network failure to IdApiError with the NETWORK_ERROR code', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(client.getUser('t')).rejects.toMatchObject({ code: 'NETWORK_ERROR', message: 'ECONNREFUSED' });
    });
  });

  describe('getTokens', () => {
    it('posts the authorization code as a form and returns the tokens', async () => {
      mockResponse(200, { access_token: 'a', refresh_token: 'r' });

      const result = await client.getTokens('code 1');

      const call = lastCall();
      expect(result).toEqual({ accessToken: 'a', refreshToken: 'r' });
      expect(call.url).toBe('http://id.test:8100/oauth/token/');
      expect(call.method).toBe('POST');
      expect(call.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(call.headers.Authorization).toBeUndefined();
      expect(new URLSearchParams(call.body).get('grant_type')).toBe('authorization_code');
      expect(new URLSearchParams(call.body).get('code')).toBe('code 1');
      expect(new URLSearchParams(call.body).get('client_id')).toBe('client-1');
      expect(new URLSearchParams(call.body).get('client_secret')).toBe('secret-1');
    });

    it('throws when tokens are missing', async () => {
      mockResponse(200, { access_token: 'a' });
      await expect(client.getTokens('c')).rejects.toThrow('Access or refresh tokens not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, { error: 'invalid_grant' });
      await expect(client.getTokens('c')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('renewTokens', () => {
    it('posts the refresh token as a form and returns the tokens', async () => {
      mockResponse(200, { access_token: 'a2', refresh_token: 'r2' });

      const result = await client.renewTokens('r1');

      const params = new URLSearchParams(lastCall().body);
      expect(result).toEqual({ accessToken: 'a2', refreshToken: 'r2' });
      expect(lastCall().url).toBe('http://id.test:8100/oauth/token/');
      expect(params.get('grant_type')).toBe('refresh_token');
      expect(params.get('refresh_token')).toBe('r1');
      expect(params.get('client_id')).toBe('client-1');
    });

    it('throws when tokens are missing', async () => {
      mockResponse(200, {});
      await expect(client.renewTokens('r')).rejects.toThrow('Access or refresh tokens not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(401, 'expired');
      await expect(client.renewTokens('r')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('getUser', () => {
    it('gets the user by access token without basic auth', async () => {
      mockResponse(200, { userId: 'u1', services: { eds: {} } });

      const user = await client.getUser('tok');

      const call = lastCall();
      expect(user.userId).toBe('u1');
      expect(call.url).toBe('http://id.test:8100/user/info?access_token=tok');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBeUndefined();
    });

    it('throws when the response has no user ID', async () => {
      mockResponse(200, { error: 'x' });
      await expect(client.getUser('tok')).rejects.toThrow('User ID not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(401, 'Unauthorized');
      await expect(client.getUser('tok')).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('getUsers / getUsersPage', () => {
    it('gets users with a query and basic auth, skipping undefined params', async () => {
      mockResponse(200, [{ userId: 'u1' }]);

      const users = await client.getUsers({ offset: 0, limit: 20, email: 'a@b.c', search: undefined });

      const call = lastCall();
      expect(users).toEqual([{ userId: 'u1' }]);
      expect(call.url).toBe('http://id.test:8100/user?offset=0&limit=20&email=a%40b.c');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('sends no query string without params', async () => {
      mockResponse(200, []);
      await client.getUsers();
      expect(lastCall().url).toBe('http://id.test:8100/user');
    });

    it('getUsersPage returns status, headers and body', async () => {
      mockResponse(200, [{ userId: 'u1' }], { 'x-total-count': '5' });

      const page = await client.getUsersPage({ role: 'admin' });

      expect(page.status).toBe(200);
      expect(page.headers['x-total-count']).toBe('5');
      expect(page.body).toEqual([{ userId: 'u1' }]);
      expect(lastCall().url).toBe('http://id.test:8100/user?role=admin');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.getUsers()).rejects.toMatchObject({ status: 500 });
    });
  });

  describe('findUserById', () => {
    it('gets the user by ID with basic auth and fills in the name', async () => {
      mockResponse(200, { userId: 'u1', last_name: 'Doe', first_name: 'John' });

      const user = await client.findUserById('u1');

      const call = lastCall();
      expect(user).toMatchObject({ userId: 'u1', name: 'Doe John' });
      expect(call.url).toBe('http://id.test:8100/user/u1');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('returns undefined without a request for a non-string ID', async () => {
      await expect(client.findUserById(5 as any)).resolves.toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns undefined and logs on an error response', async () => {
      mockResponse(404, 'User not found');

      await expect(client.findUserById('u1')).resolves.toBeUndefined();
      expect(log.save).toHaveBeenCalledWith('id-request-find-by-user-id-error', { id: 'u1', error: 'User not found' }, 'error');
    });
  });

  describe('findUserByIdWithCache', () => {
    it('returns the cached user without a request', async () => {
      const cached = [{ userId: 'u1' }];

      await expect(client.findUserByIdWithCache('u1', cached)).resolves.toEqual({ userId: 'u1' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches and caches a missing user', async () => {
      mockResponse(200, { userId: 'u2', first_name: 'A' });
      const cached: any[] = [];

      const user = await client.findUserByIdWithCache('u2', cached);

      expect(user).toMatchObject({ userId: 'u2' });
      expect(cached).toHaveLength(1);
    });

    it('returns undefined when the user is not found', async () => {
      mockResponse(404, 'nope');
      await expect(client.findUserByIdWithCache('u3')).resolves.toBeUndefined();
    });
  });

  describe('getUsersByIdsWithCache', () => {
    it('returns the cache when every ID is cached', async () => {
      const cached: any[] = [{ userId: 'u1' }];

      await expect(client.getUsersByIdsWithCache(['u1', 'u1'], cached)).resolves.toBe(cached);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches only the missing unique IDs and appends them', async () => {
      mockResponse(200, [{ userId: 'u2' }]);

      const result = await client.getUsersByIdsWithCache(['u1', 'u2', 'u2'], [{ userId: 'u1' } as any]);

      expect(JSON.parse(lastCall().body as string)).toEqual({ id: ['u2'] });
      expect(result.map((v) => v.userId)).toEqual(['u1', 'u2']);
    });
  });

  describe('getUsersByIdsRaw / getUsersByIds', () => {
    it('posts the IDs with basic auth and returns raw users', async () => {
      mockResponse(200, [{ userId: 'u1' }]);

      const users = await client.getUsersByIdsRaw(['u1', 'u2']);

      const call = lastCall();
      expect(users).toEqual([{ userId: 'u1' }]);
      expect(call.url).toBe('http://id.test:8100/user/info/id');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(call.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(call.body as string)).toEqual({ id: ['u1', 'u2'] });
    });

    it('wraps a single ID into an array', async () => {
      mockResponse(200, []);
      await client.getUsersByIdsRaw('u1');
      expect(JSON.parse(lastCall().body as string)).toEqual({ id: ['u1'] });
    });

    it('passes brief_info when requested', async () => {
      mockResponse(200, []);
      await client.getUsersByIdsRaw(['u1'], { briefInfo: true });
      expect(lastCall().url).toBe('http://id.test:8100/user/info/id?brief_info=true');
    });

    it('drops non-string IDs and returns an empty list without a request', async () => {
      await expect(client.getUsersByIdsRaw([1, null] as any)).resolves.toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('keeps only 24-character IDs in strict mode', async () => {
      const valid = 'a'.repeat(24);
      mockResponse(200, []);

      await client.getUsersByIdsRaw([valid, 'short'], { strictIds: true });

      expect(JSON.parse(lastCall().body as string)).toEqual({ id: [valid] });
    });

    it('uses the client strictIds config when the call does not set it', async () => {
      const valid = 'a'.repeat(24);
      const strictClient = new IdApiClient({ ...baseConfig, strictIds: true, getLog: () => log });
      mockResponse(200, []);

      await strictClient.getUsersByIdsRaw([valid, 'short']);

      expect(JSON.parse(lastCall().body as string)).toEqual({ id: [valid] });
    });

    it('lets the call strictIds option override the client config', async () => {
      const strictClient = new IdApiClient({ ...baseConfig, strictIds: true, getLog: () => log });
      mockResponse(200, []);

      await strictClient.getUsersByIdsRaw(['a'.repeat(24), 'short'], { strictIds: false });

      expect(JSON.parse(lastCall().body as string)).toEqual({ id: ['a'.repeat(24), 'short'] });
    });

    it('throws when the response is not an array', async () => {
      mockResponse(200, { a: 1 });
      await expect(client.getUsersByIdsRaw(['u1'])).rejects.toThrow('User not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.getUsersByIdsRaw(['u1'])).rejects.toBeInstanceOf(IdApiError);
    });

    it('getUsersByIds returns normalized user info', async () => {
      mockResponse(200, [{ userId: 'u1', last_name: 'Doe', first_name: 'John', avaUrl: '/ava/1.png' }]);

      const [user] = await client.getUsersByIds('u1');

      expect(user).toMatchObject({ userId: 'u1', name: 'Doe John', firstName: 'John', avaUrl: 'http://id.test:8100/ava/1.png' });
    });

    it('getUsersByIds keeps private props on request', async () => {
      mockResponse(200, [{ userId: 'u1', secretField: 'x' }]);

      const [user] = await client.getUsersByIds('u1', { withPrivateProps: true });

      expect(user.secretField).toBe('x');
      expect(user.services).toBeDefined();
    });
  });

  describe('getUsersByCodesRaw / getUserByCode', () => {
    it('posts the ipn with basic auth and returns raw users', async () => {
      mockResponse(200, [{ userId: 'u1' }]);

      const users = await client.getUsersByCodesRaw('1234567890');

      const call = lastCall();
      expect(users).toEqual([{ userId: 'u1' }]);
      expect(call.url).toBe('http://id.test:8100/user/info/ipn');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ ipn: '1234567890' });
    });

    it('throws when the response is not an array', async () => {
      mockResponse(200, 'x');
      await expect(client.getUsersByCodesRaw('1')).rejects.toThrow('User not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(403, 'forbidden');
      await expect(client.getUsersByCodesRaw('1')).rejects.toBeInstanceOf(IdApiError);
    });

    it('getUserByCode returns the first normalized user for a single code', async () => {
      mockResponse(200, [{ userId: 'u1', ipn: '1' }, { userId: 'u2' }]);
      await expect(client.getUserByCode('1')).resolves.toMatchObject({ userId: 'u1', ipn: '1' });
    });

    it('getUserByCode returns null when nothing is found', async () => {
      mockResponse(200, []);
      await expect(client.getUserByCode('1')).resolves.toBeNull();
    });

    it('getUserByCode returns a list for an array of codes', async () => {
      mockResponse(200, [{ userId: 'u1' }, { userId: 'u2' }]);

      const users = (await client.getUserByCode([1, 2])) as any[];

      expect(users.map((v) => v.userId)).toEqual(['u1', 'u2']);
      expect(JSON.parse(lastCall().body as string)).toEqual({ ipn: [1, 2] });
    });
  });

  describe('getUsersByEdrpouRaw', () => {
    it('posts the EDRPOU list with basic auth', async () => {
      mockResponse(200, [{ userId: 'u1' }]);

      const users = await client.getUsersByEdrpouRaw('12345678');

      const call = lastCall();
      expect(users).toEqual([{ userId: 'u1' }]);
      expect(call.url).toBe('http://id.test:8100/user/info/edrpou');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ edrpou: ['12345678'] });
    });

    it('keeps an array as is', async () => {
      mockResponse(200, []);
      await client.getUsersByEdrpouRaw(['1', '2']);
      expect(JSON.parse(lastCall().body as string)).toEqual({ edrpou: ['1', '2'] });
    });

    it('throws when the response is not an array', async () => {
      mockResponse(200, {});
      await expect(client.getUsersByEdrpouRaw('1')).rejects.toThrow('User not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.getUsersByEdrpouRaw('1')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('getUserByEmail', () => {
    it('gets users by email with basic auth and returns the first one', async () => {
      mockResponse(200, [{ userId: 'u1', email: 'a@b.c' }]);

      const user = await client.getUserByEmail('a@b.c');

      const call = lastCall();
      expect(user).toMatchObject({ userId: 'u1' });
      expect(call.url).toBe('http://id.test:8100/user?email=a%40b.c');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('returns null when nothing is found', async () => {
      mockResponse(200, []);
      await expect(client.getUserByEmail('a@b.c')).resolves.toBeNull();
    });

    it('returns a list for an array of emails', async () => {
      mockResponse(200, [{ userId: 'u1' }, { userId: 'u2' }]);

      const users = (await client.getUserByEmail(['a@b.c', 'd@e.f'])) as any[];

      expect(users).toHaveLength(2);
      expect(lastCall().url).toBe('http://id.test:8100/user?email=a%40b.c%2Cd%40e.f');
    });

    it('throws when the response is not an array', async () => {
      mockResponse(200, 'x');
      await expect(client.getUserByEmail('a@b.c')).rejects.toThrow('User not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.getUserByEmail('a@b.c')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('getUserInfoByPhone', () => {
    it('gets the user by phone with basic auth', async () => {
      mockResponse(200, { userId: 'u1' });

      const user = await client.getUserInfoByPhone('380501234567');

      const call = lastCall();
      expect(user).toEqual({ userId: 'u1' });
      expect(call.url).toBe('http://id.test:8100/user/info/phone?phone=380501234567');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('throws IdApiError with status 404 when the user is not found', async () => {
      mockResponse(404, '');
      await expect(client.getUserInfoByPhone('1')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('searchUsersRaw / searchUsers', () => {
    it('posts the search string with the default limit', async () => {
      mockResponse(200, [{ userId: 'u1' }]);

      const users = await client.searchUsersRaw('john');

      const call = lastCall();
      expect(users).toEqual([{ userId: 'u1' }]);
      expect(call.url).toBe('http://id.test:8100/user/info/search');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ searchString: 'john', limit: 10 });
    });

    it('uses a custom limit', async () => {
      mockResponse(200, []);
      await client.searchUsersRaw('john', 3);
      expect(JSON.parse(lastCall().body as string)).toEqual({ searchString: 'john', limit: 3 });
    });

    it('throws when the response is not an array', async () => {
      mockResponse(200, {});
      await expect(client.searchUsersRaw('x')).rejects.toThrow('Users list not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.searchUsersRaw('x')).rejects.toBeInstanceOf(IdApiError);
    });

    it('searchUsers returns normalized users', async () => {
      mockResponse(200, [{ userId: 'u1', first_name: 'John', last_name: 'Doe' }]);

      const users = await client.searchUsers('john');

      expect(users[0]).toMatchObject({ userId: 'u1', name: 'Doe John' });
    });
  });

  describe('checkEmail', () => {
    it('returns true when the email exists', async () => {
      mockResponse(200, { isExist: true });

      await expect(client.checkEmail('a@b.c')).resolves.toBe(true);

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/user/info/email/check?email=a%40b.c');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('returns false when the email does not exist', async () => {
      mockResponse(200, { isExist: false });
      await expect(client.checkEmail('a@b.c')).resolves.toBe(false);
    });

    it('throws when the response is not an object', async () => {
      mockResponse(200, 'ok');
      await expect(client.checkEmail('a@b.c')).rejects.toThrow('Email existence status not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, 'bad');
      await expect(client.checkEmail('a@b.c')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('updateUser', () => {
    it('posts a form with the access token and returns true on ok', async () => {
      mockResponse(200, 'ok');

      const result = await client.updateUser('u1', 'tok', {
        gender: 'male',
        phone: '380501234567',
        isValidPhone: true,
        valid: { phone: true },
        isIndividualEntrepreneur: false,
        isPrivateHouse: true,
        addressStruct: { city: 'Kyiv' },
        passportSeries: 'AB',
        idCardNumber: '123',
      });

      const call = lastCall();
      const params = new URLSearchParams(call.body);
      expect(result).toBe(true);
      expect(call.url).toBe('http://id.test:8100/user/info');
      expect(call.method).toBe('POST');
      expect(call.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(call.headers.Authorization).toBeUndefined();
      expect(params.get('MIME Type')).toBe('application/x-www-form-urlencoded');
      expect(params.get('userId')).toBe('u1');
      expect(params.get('access_token')).toBe('tok');
      expect(params.get('gender')).toBe('male');
      expect(params.get('isValidPhone')).toBe('true');
      expect(params.get('valid[phone]')).toBe('true');
      expect(params.get('isIndividualEntrepreneur')).toBe('false');
      expect(params.get('is_private_house')).toBe('true');
      expect(params.get('addressStruct')).toBe('{"city":"Kyiv"}');
      expect(params.get('passport_series')).toBe('AB');
      expect(params.get('id_card_number')).toBe('123');
      expect(params.has('birthday')).toBe(false);
    });

    it('sends email and foreigners document fields', async () => {
      mockResponse(200, 'ok');

      await client.updateUser('u1', 'tok', {
        email: 'a@b.c',
        isValidEmail: true,
        valid: { email: true },
        foreignersDocumentSeries: 'FS',
        foreignersDocumentType: { id: 1 },
      });

      const params = new URLSearchParams(lastCall().body);
      expect(params.get('email')).toBe('a@b.c');
      expect(params.get('isValidEmail')).toBe('true');
      expect(params.get('valid[email]')).toBe('true');
      expect(params.get('foreigners_document_series')).toBe('FS');
      expect(params.get('foreigners_document_type')).toBe('{"id":1}');
    });

    it('defaults twoFactorType to phone when two factor auth is enabled', async () => {
      mockResponse(200, 'ok');
      await client.updateUser('u1', 'tok', { useTwoFactorAuth: 'true' });
      expect(new URLSearchParams(lastCall().body).get('twoFactorType')).toBe('phone');
    });

    it('keeps an explicit twoFactorType', async () => {
      mockResponse(200, 'ok');
      await client.updateUser('u1', 'tok', { useTwoFactorAuth: 'true', twoFactorType: 'totp' });
      expect(new URLSearchParams(lastCall().body).get('twoFactorType')).toBe('totp');
    });

    it('does not send twoFactorType when two factor auth is disabled with a string flag', async () => {
      mockResponse(200, 'ok');
      await client.updateUser('u1', 'tok', { useTwoFactorAuth: 'false' });
      const params = new URLSearchParams(lastCall().body);
      expect(params.get('useTwoFactorAuth')).toBe('false');
      expect(params.has('twoFactorType')).toBe(false);
    });

    it('does not send twoFactorType when two factor auth is disabled with a boolean flag', async () => {
      mockResponse(200, 'ok');
      await client.updateUser('u1', 'tok', { useTwoFactorAuth: false });
      const params = new URLSearchParams(lastCall().body);
      expect(params.get('useTwoFactorAuth')).toBe('false');
      expect(params.has('twoFactorType')).toBe(false);
    });

    it('defaults twoFactorType to phone when two factor auth is enabled with a boolean flag', async () => {
      mockResponse(200, 'ok');
      await client.updateUser('u1', 'tok', { useTwoFactorAuth: true });
      const params = new URLSearchParams(lastCall().body);
      expect(params.get('useTwoFactorAuth')).toBe('true');
      expect(params.get('twoFactorType')).toBe('phone');
    });

    it('returns false when id-api does not answer ok', async () => {
      mockResponse(200, 'not ok');
      await expect(client.updateUser('u1', 'tok', {})).resolves.toBe(false);
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(401, 'Unauthorized');
      await expect(client.updateUser('u1', 'tok', {})).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('updateUserById', () => {
    it('puts the data with basic auth and the initiator', async () => {
      mockResponse(200, 'ok');

      const result = await client.updateUserById('u1', { phone: '1' }, 'admin-1');

      const call = lastCall();
      expect(result).toBe('ok');
      expect(call.url).toBe('http://id.test:8100/user/info/u1');
      expect(call.method).toBe('PUT');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ phone: '1', updateInitiator: 'admin-1' });
    });

    it('sends the data as is without an initiator', async () => {
      mockResponse(200, 'ok');
      await client.updateUserById('u1', { phone: '1' });
      expect(JSON.parse(lastCall().body as string)).toEqual({ phone: '1' });
    });

    it('throws when id-api does not answer ok', async () => {
      mockResponse(200, { error: 'x' });
      await expect(client.updateUserById('u1', {})).rejects.toThrow('User info was not updated by auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(404, 'User not found');
      await expect(client.updateUserById('u1', {})).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('updateUserOnboarding', () => {
    it('puts the onboarding params with basic auth', async () => {
      mockResponse(200, 'ok');

      await client.updateUserOnboarding('u1', { onboardingTaskId: 't1', needOnboarding: true });

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/user/info/onboarding');
      expect(call.method).toBe('PUT');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ userId: 'u1', onboardingTaskId: 't1', needOnboarding: true });
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(404, 'User not found');
      await expect(client.updateUserOnboarding('u1', { onboardingTaskId: 't1', needOnboarding: true })).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('deleteUser', () => {
    it('deletes the user with a JSON body and basic auth', async () => {
      mockResponse(200, { success: true });

      const result = await client.deleteUser('u1');

      const call = lastCall();
      expect(result).toEqual({ success: true });
      expect(call.url).toBe('http://id.test:8100/user');
      expect(call.method).toBe('DELETE');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ userId: 'u1' });
    });

    it('treats a response without an error as success', async () => {
      mockResponse(200, 'ok');
      await expect(client.deleteUser('u1')).resolves.toEqual({ success: true });
    });

    it('returns failure when id-api answers with an error', async () => {
      mockResponse(200, { error: 'denied' });
      await expect(client.deleteUser('u1')).resolves.toEqual({ success: false, error: 'denied' });
    });

    it('returns failure instead of throwing on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.deleteUser('u1')).resolves.toEqual({ success: false });
    });

    it('is not allowed when canDeleteUser is false', async () => {
      const locked = new IdApiClient({ ...baseConfig, canDeleteUser: false });

      await expect(locked.deleteUser('u1')).resolves.toEqual({ success: false, message: 'Method is not allowed' });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('logoutByUserId', () => {
    it('posts to the logout route with basic auth', async () => {
      mockResponse(201, { data: { accepted: true } });

      const result = await client.logoutByUserId('u1');

      const call = lastCall();
      expect(result).toEqual({ data: { accepted: true } });
      expect(call.url).toBe('http://id.test:8100/user/u1/logout');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.logoutByUserId('u1')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('logoutOtherSessions', () => {
    it('posts a form with tokens and returns true when accepted', async () => {
      mockResponse(200, { data: { accepted: true } });

      const result = await client.logoutOtherSessions('u1', 'a', 'r');

      const call = lastCall();
      const params = new URLSearchParams(call.body);
      expect(result).toBe(true);
      expect(call.url).toBe('http://id.test:8100/user/logout_other_sessions');
      expect(call.method).toBe('POST');
      expect(call.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(call.headers.Authorization).toBeUndefined();
      expect(params.get('userId')).toBe('u1');
      expect(params.get('access_token')).toBe('a');
      expect(params.get('refresh_token')).toBe('r');
    });

    it('returns false when not accepted', async () => {
      mockResponse(200, { data: { accepted: false } });
      await expect(client.logoutOtherSessions('u1', 'a', 'r')).resolves.toBe(false);
    });

    it('returns false instead of throwing on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.logoutOtherSessions('u1', 'a', 'r')).resolves.toBe(false);
      expect(log.save).toHaveBeenCalledWith('logout-other-sessions-request-error', { error: 'boom', userId: 'u1' }, 'error');
    });
  });

  describe('prepareUser', () => {
    const params = { name: 'John', surname: 'Doe', middleName: 'M', ipn: '1234567890', email: 'a@b.c' };

    it('posts a form with basic auth and returns the prepared user', async () => {
      mockResponse(200, { userId: 'u1' });

      const result = await client.prepareUser(params);

      const call = lastCall();
      const form = new URLSearchParams(call.body);
      expect(result).toEqual({ userId: 'u1' });
      expect(call.url).toBe('http://id.test:8100/user/prepare');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(form.get('name')).toBe('John');
      expect(form.get('surname')).toBe('Doe');
      expect(form.get('middlename')).toBe('M');
      expect(form.get('ipn')).toBe('1234567890');
      expect(form.get('email')).toBe('a@b.c');
    });

    it('transliterates the IPN when a transliterator is configured', async () => {
      const withTranslit = new IdApiClient({ ...baseConfig, ipnTransliterator: { transform: (v) => `T-${v}`, reverse: (v) => v } });
      mockResponse(200, { userId: 'u1' });

      await withTranslit.prepareUser(params);

      expect(new URLSearchParams(lastCall().body).get('ipn')).toBe('T-1234567890');
    });

    it('returns undefined when no user ID is returned', async () => {
      mockResponse(200, {});
      await expect(client.prepareUser(params)).resolves.toBeUndefined();
    });

    it('returns undefined instead of throwing on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.prepareUser(params)).resolves.toBeUndefined();
    });
  });

  describe('createLocalUser', () => {
    const options = { email: 'a@b.c', password: 'secret', firstName: 'John', lastName: 'Doe' };

    it('posts the user with basic auth', async () => {
      mockResponse(200, { userId: 'u1' });

      const result = await client.createLocalUser(options);

      const call = lastCall();
      expect(result).toEqual({ userId: 'u1' });
      expect(call.url).toBe('http://id.test:8100/user/create_local');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual(options);
    });

    it('masks the password in logs', async () => {
      mockResponse(200, { userId: 'u1' });
      await client.createLocalUser(options);
      expect(log.save).toHaveBeenCalledWith('create-local-user-options', expect.objectContaining({ password: '***' }), undefined);
    });

    it('rethrows IdApiError on a non-2xx response', async () => {
      mockResponse(400, { error: 'exists' });
      await expect(client.createLocalUser(options)).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('setUserPassword', () => {
    it('posts the user ID and password with basic auth', async () => {
      mockResponse(200, { success: true });

      const result = await client.setUserPassword({ id: 'u1', password: 'secret' });

      const call = lastCall();
      expect(result).toEqual({ success: true });
      expect(call.url).toBe('http://id.test:8100/user/password/set');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ userId: 'u1', password: 'secret' });
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, { error: 'weak' });
      await expect(client.setUserPassword({ id: 'u1', password: 'x' })).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('changePassword', () => {
    it('posts the passwords with basic auth and returns success', async () => {
      mockResponse(200, { success: true, message: 'Password changed successfully.' });

      const result = await client.changePassword('a@b.c', 'old', 'new');

      const call = lastCall();
      expect(result).toEqual({ success: true, message: 'Password changed successfully.' });
      expect(call.url).toBe('http://id.test:8100/authorise/local/change_password');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ email: 'a@b.c', oldPassword: 'old', newPassword: 'new' });
    });

    it('returns the error when id-api answers with success false', async () => {
      mockResponse(200, { success: false, error: 'Weak password' });
      await expect(client.changePassword('a@b.c', 'old', 'new')).resolves.toEqual({ success: false, error: 'Weak password' });
    });

    it('returns the error body of a 401 response instead of throwing', async () => {
      mockResponse(401, { success: false, error: 'Invalid credentials' });
      await expect(client.changePassword('a@b.c', 'old', 'new')).resolves.toEqual({ success: false, error: 'Invalid credentials' });
    });

    it('returns failure on a network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(client.changePassword('a@b.c', 'old', 'new')).resolves.toEqual({ success: false, error: undefined });
    });

    it('never logs the passwords', async () => {
      mockResponse(200, { success: true });
      await client.changePassword('a@b.c', 'old-secret', 'new-secret');
      expect(JSON.stringify(log.save.mock.calls)).not.toContain('secret');
    });
  });

  describe('sendSms', () => {
    it('gets the send route with the phone and returns sendBySms', async () => {
      mockResponse(200, { sendBySms: 'sent' });

      await expect(client.sendSms(380501234567)).resolves.toBe('sent');

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/sign_up/confirmation/phone/send?phone=380501234567');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBeUndefined();
    });

    it('throws when sendBySms is missing', async () => {
      mockResponse(200, {});
      await expect(client.sendSms('1')).rejects.toThrow('Phone verification not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, 'bad');
      await expect(client.sendSms('1')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('verifyPhone', () => {
    it('returns true for a confirm response', async () => {
      mockResponse(200, 'confirm');

      await expect(client.verifyPhone('380501234567', 1234)).resolves.toBe(true);

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/sign_up/confirmation/phone/verify?phone=380501234567&code=1234');
      expect(call.method).toBe('GET');
    });

    it('returns false for any other response', async () => {
      mockResponse(200, 'reject');
      await expect(client.verifyPhone('1', 1)).resolves.toBe(false);
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.verifyPhone('1', 1)).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('verifyPhoneAndSet', () => {
    it('posts with the access token in the query', async () => {
      mockResponse(200, { data: { isConfirmed: true } });

      const result = await client.verifyPhoneAndSet('380501234567', 1234, 'tok');

      const call = lastCall();
      expect(result).toEqual({ data: { isConfirmed: true } });
      expect(call.url).toBe('http://id.test:8100/sign_up/confirmation/phone/verify?phone=380501234567&code=1234&access_token=tok');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBeUndefined();
    });

    it('does not log the access token', async () => {
      mockResponse(200, {});
      await client.verifyPhoneAndSet('1', 1, 'tok-secret');
      expect(JSON.stringify(log.save.mock.calls)).not.toContain('tok-secret');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(401, 'Unauthorized');
      await expect(client.verifyPhoneAndSet('1', 1, 'tok')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('checkPhoneExist', () => {
    it('reports an existing confirmed phone', async () => {
      mockResponse(200, { text: 'user', valid: { phone: true } });

      await expect(client.checkPhoneExist('380501234567')).resolves.toEqual({ isExist: true, isConfirmed: true });

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/sign_up/confirmation/phone/exist?phone=380501234567');
      expect(call.method).toBe('GET');
    });

    it('reports a missing phone', async () => {
      mockResponse(200, { text: 'null' });
      await expect(client.checkPhoneExist('1')).resolves.toEqual({ isExist: false, isConfirmed: false });
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.checkPhoneExist('1')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('changeEmail', () => {
    it('gets the send route with the email', async () => {
      mockResponse(200, { sent: true });

      await expect(client.changeEmail('a@b.c')).resolves.toEqual({ sent: true });

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/user/info/email/send?email=a%40b.c');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBeUndefined();
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, 'bad');
      await expect(client.changeEmail('a@b.c')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('confirmChangeEmail', () => {
    it('gets the set route with email, code and access token', async () => {
      mockResponse(200, { userId: 'u1' });

      await expect(client.confirmChangeEmail('a@b.c', 123456, 'tok')).resolves.toEqual({ userId: 'u1' });

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/user/info/email/set?email=a%40b.c&code_email=123456&access_token=tok');
      expect(call.method).toBe('GET');
    });

    it('throws when the response has no user ID', async () => {
      mockResponse(200, {});
      await expect(client.confirmChangeEmail('a@b.c', 1, 'tok')).rejects.toThrow('Confirmation change email not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, 'bad');
      await expect(client.confirmChangeEmail('a@b.c', 1, 'tok')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('checkEmailConfirmationCode', () => {
    it('gets the check route with email, code and access token', async () => {
      mockResponse(200, { isCodeConfirmed: true });

      await expect(client.checkEmailConfirmationCode('a@b.c', 123456, 'tok')).resolves.toEqual({ isCodeConfirmed: true });

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/user/info/email/check_email_confirmation_code?email=a%40b.c&code_email=123456&access_token=tok');
      expect(call.method).toBe('GET');
    });

    it('throws when the code is not confirmed', async () => {
      mockResponse(200, { isCodeConfirmed: false });
      await expect(client.checkEmailConfirmationCode('a@b.c', 1, 'tok')).rejects.toThrow('Email code not confirmed by auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, { isCodeConfirmed: false, error: 'bad' });
      await expect(client.checkEmailConfirmationCode('a@b.c', 1, 'tok')).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('generateUserTotp', () => {
    it('gets the secret and uri with basic auth', async () => {
      mockResponse(200, { secret: 'S', uri: 'otpauth://S' });

      const result = await client.generateUserTotp('u1');

      const call = lastCall();
      expect(result).toEqual({ success: true, secret: 'S', uri: 'otpauth://S' });
      expect(call.url).toBe('http://id.test:8100/totp/generate?userId=u1');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('returns failure when id-api answers with an error', async () => {
      mockResponse(200, { error: { message: 'no' } });
      await expect(client.generateUserTotp('u1')).resolves.toEqual({ success: false });
    });

    it('returns failure instead of throwing on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.generateUserTotp('u1')).resolves.toEqual({ success: false });
    });

    it('never logs the secret', async () => {
      mockResponse(200, { secret: 'TOP-SECRET', uri: 'otpauth://TOP-SECRET' });
      await client.generateUserTotp('u1');
      expect(JSON.stringify(log.save.mock.calls)).not.toContain('TOP-SECRET');
    });
  });

  describe('enableUserTotpSecret', () => {
    it('posts the secret and code with basic auth', async () => {
      mockResponse(200, { success: true });

      const result = await client.enableUserTotpSecret('u1', 'S', '123456');

      const call = lastCall();
      expect(result).toEqual({ success: true });
      expect(call.url).toBe('http://id.test:8100/totp/enable');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ userId: 'u1', secret: 'S', code: '123456' });
    });

    it('returns failure when id-api answers with an error', async () => {
      mockResponse(200, { error: 'bad code' });
      await expect(client.enableUserTotpSecret('u1', 'S', '1')).resolves.toEqual({ success: false });
    });

    it('returns failure instead of throwing on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.enableUserTotpSecret('u1', 'S', '1')).resolves.toEqual({ success: false });
    });
  });

  describe('disableUserTotpSecret', () => {
    it('posts the code with basic auth', async () => {
      mockResponse(200, { success: true });

      const result = await client.disableUserTotpSecret('u1', '123456');

      const call = lastCall();
      expect(result).toEqual({ success: true });
      expect(call.url).toBe('http://id.test:8100/totp/disable');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ userId: 'u1', code: '123456' });
    });

    it('returns failure when id-api answers with an error', async () => {
      mockResponse(200, { error: 'bad code' });
      await expect(client.disableUserTotpSecret('u1', '1')).resolves.toEqual({ success: false });
    });

    it('returns failure instead of throwing on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.disableUserTotpSecret('u1', '1')).resolves.toEqual({ success: false });
    });
  });

  describe('getLoginHistory', () => {
    const rawEntry = {
      id: 'h1',
      created_at: '2024-01-01',
      user_id: 'u1',
      user_name: 'John',
      ip: '1.1.1.1',
      user_agent: 'UA',
      client_id: 'c1',
      client_name: 'Client',
      is_blocked: false,
      action_type: 'login',
      expires_at: '2024-02-01',
    };

    it('gets the history with a JSON-string filter and maps entries', async () => {
      mockResponse(200, { data: [rawEntry], meta: { count: 1, offset: 0, limit: 10 } });

      const result = await client.getLoginHistory({ filter: { userId: 'u1' } });

      const call = lastCall();
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(call.url).toBe(`http://id.test:8100/login_history?offset=0&limit=10&filter=${encodeURIComponent('{"userId":"u1"}')}`);
      expect(result.meta).toEqual({ count: 1, offset: 0, limit: 10 });
      expect(result.data[0]).toEqual({
        id: 'h1',
        createdAt: '2024-01-01',
        userId: 'u1',
        userName: 'John',
        ip: '1.1.1.1',
        userAgent: 'UA',
        clientId: 'c1',
        clientName: 'Client',
        isBlocked: false,
        actionType: 'login',
        expiresAt: '2024-02-01',
      });
    });

    it('passes a string filter as is', async () => {
      mockResponse(200, { data: [], meta: {} });
      await client.getLoginHistory({ offset: 5, limit: 2, filter: '{"a":1}' });
      expect(lastCall().url).toBe(`http://id.test:8100/login_history?offset=5&limit=2&filter=${encodeURIComponent('{"a":1}')}`);
    });

    it('uses defaults without arguments', async () => {
      mockResponse(200, { data: [], meta: {} });
      await client.getLoginHistory();
      expect(lastCall().url).toBe(`http://id.test:8100/login_history?offset=0&limit=10&filter=${encodeURIComponent('{}')}`);
    });

    it('throws when data is not an array', async () => {
      mockResponse(200, { meta: {} });
      await expect(client.getLoginHistory()).rejects.toThrow('Login history not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, { error: 'bad filter' });
      await expect(client.getLoginHistory()).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('getUserAdminActions', () => {
    it('gets the actions with a nested filter query and maps entries', async () => {
      mockResponse(200, {
        data: [
          {
            id: 'a1',
            data: { userId: 'u1', last_name: 'Doe', first_name: 'John', middle_name: 'M', ipn: '1', email: 'a@b.c' },
            created_by: 'admin',
            created_at: '2024-01-01',
            action_type: 'block',
          },
        ],
        meta: { count: 1, offset: 0, limit: 10 },
      });

      const result = await client.getUserAdminActions({ filter: { actionType: 'block', user: { id: 'u1' } } });

      const call = lastCall();
      const url = new URL(call.url);
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(url.pathname).toBe('/user_admin_actions');
      expect(url.searchParams.get('offset')).toBe('0');
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('filter[actionType]')).toBe('block');
      expect(url.searchParams.get('filter[user][id]')).toBe('u1');
      expect(result.data[0]).toEqual({
        id: 'a1',
        user: { id: 'u1', lastName: 'Doe', firstName: 'John', middleName: 'M', ipn: '1', email: 'a@b.c' },
        createdBy: 'admin',
        createdAt: '2024-01-01',
        actionType: 'block',
      });
      expect(result.meta).toEqual({ count: 1, offset: 0, limit: 10 });
    });

    it('throws when data is not an array', async () => {
      mockResponse(200, {});
      await expect(client.getUserAdminActions()).rejects.toThrow('User admin actions not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.getUserAdminActions()).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('getUserStatByDate', () => {
    it('gets the stat for a date with basic auth', async () => {
      mockResponse(200, { new_users: 1, on_board_users: 2, login_count: 3 });

      const result = await client.getUserStatByDate({ date: '2024-01-01' });

      const call = lastCall();
      expect(result).toEqual({ new_users: 1, on_board_users: 2, login_count: 3 });
      expect(call.url).toBe('http://id.test:8100/stat/2024-01-01');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('throws when new_users is missing', async () => {
      mockResponse(200, {});
      await expect(client.getUserStatByDate({ date: '2024-01-01' })).rejects.toThrow('User stat not responsed from auth server.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(500, 'boom');
      await expect(client.getUserStatByDate({ date: '2024-01-01' })).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('getUserStatByPeriod', () => {
    it('requests every day and sums the results', async () => {
      mockResponse(200, { new_users: 1, on_board_users: 1, login_count: 10 });
      mockResponse(200, { new_users: '2', on_board_users: 0, login_count: 20 });

      const result = await client.getUserStatByPeriod({ from: '2024-01-01', to: '2024-01-02' });

      expect(result).toEqual({ new_users: 3, on_board_users: 1, login_count: 30 });
      expect((global.fetch as jest.Mock).mock.calls.map((c) => c[0])).toEqual([
        'http://id.test:8100/stat/2024-01-01',
        'http://id.test:8100/stat/2024-01-02',
      ]);
    });

    it('throws when from is after to', async () => {
      await expect(client.getUserStatByPeriod({ from: '2024-01-02', to: '2024-01-01' })).rejects.toThrow(
        "Option 'from' must be less than option 'to'",
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects when one of the days fails', async () => {
      mockResponse(200, { new_users: 1 });
      mockResponse(500, 'boom');

      await expect(client.getUserStatByPeriod({ from: '2024-01-01', to: '2024-01-02' })).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('ldapGroupsExist', () => {
    it('posts the DNs with basic auth and returns the existing ones', async () => {
      mockResponse(200, { existing: ['cn=a'] });

      const result = await client.ldapGroupsExist(['cn=a', 'cn=b']);

      const call = lastCall();
      expect(result).toEqual(['cn=a']);
      expect(call.url).toBe('http://id.test:8100/ldap/groups/exists');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ dns: ['cn=a', 'cn=b'] });
    });

    it('throws when existing is not an array', async () => {
      mockResponse(200, {});
      await expect(client.ldapGroupsExist(['cn=a'])).rejects.toThrow('Wrong response format.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(400, { error: 'invalid' });
      await expect(client.ldapGroupsExist([])).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('addTestCode', () => {
    it('posts the code with basic auth and returns true when initialized', async () => {
      mockResponse(200, { data: { code: 'c1' } });

      await expect(client.addTestCode('c1', 'u1')).resolves.toBe(true);

      const call = lastCall();
      expect(call.url).toBe('http://id.test:8100/oauth/token/test_code');
      expect(call.method).toBe('POST');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
      expect(JSON.parse(call.body as string)).toEqual({ code: 'c1', userId: 'u1' });
    });

    it('returns false when the code differs', async () => {
      mockResponse(200, { data: { code: 'other' } });
      await expect(client.addTestCode('c1', 'u1')).resolves.toBe(false);
    });

    it('throws for a non-object response', async () => {
      mockResponse(200, 'text');
      await expect(client.addTestCode('c1', 'u1')).rejects.toThrow('Wrong response format.');
    });

    it('throws the id-api error message', async () => {
      mockResponse(200, { error: { message: 'Not allowed' } });
      await expect(client.addTestCode('c1', 'u1')).rejects.toThrow('Not allowed');
    });

    it('throws when data is missing', async () => {
      mockResponse(200, {});
      await expect(client.addTestCode('c1', 'u1')).rejects.toThrow('Wrong response data format.');
    });

    it('throws IdApiError on a non-2xx response', async () => {
      mockResponse(404, 'Not found');
      await expect(client.addTestCode('c1', 'u1')).rejects.toBeInstanceOf(IdApiError);
    });
  });

  describe('sendPingRequest', () => {
    it('returns version, customer, environment and body', async () => {
      mockResponse(200, { message: 'pong' }, { version: '1.2.3', customer: 'acme', environment: 'prod' });

      const result = await client.sendPingRequest();

      const call = lastCall();
      expect(result).toEqual({ version: '1.2.3', customer: 'acme', environment: 'prod', body: { message: 'pong' } });
      expect(call.url).toBe('http://id.test:8100/test/ping_with_auth');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toBe(`Basic ${BASIC_TOKEN}`);
    });

    it('returns undefined instead of throwing on a non-2xx response', async () => {
      mockResponse(401, 'Unauthorized');
      await expect(client.sendPingRequest()).resolves.toBeUndefined();
    });

    it('returns undefined on a network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(client.sendPingRequest()).resolves.toBeUndefined();
    });
  });

  describe('route overrides', () => {
    it('uses an overridden route for requests', async () => {
      const custom = new IdApiClient({ ...baseConfig, routes: { getUserInfo: '/v2/me' } });
      mockResponse(200, { userId: 'u1', services: {} });

      await custom.getUser('tok');

      expect(lastCall().url).toBe('http://id.test:8100/v2/me?access_token=tok');
    });
  });

  describe('helpers', () => {
    it('buildAvatarUrl prefixes the base URL', () => {
      expect(client.buildAvatarUrl('/ava/1.png')).toBe('http://id.test:8100/ava/1.png');
    });

    it('buildAvatarUrl returns an empty string without a path', () => {
      expect(client.buildAvatarUrl(undefined)).toBe('');
    });

    it('buildAvatarUrl keeps an absolute URL as is', () => {
      expect(client.buildAvatarUrl('http://id.test:8100/ava/1.png')).toBe('http://id.test:8100/ava/1.png');
    });

    it('buildAvatarUrl keeps an absolute https URL as is', () => {
      expect(client.buildAvatarUrl('https://cdn.test/ava/1.png')).toBe('https://cdn.test/ava/1.png');
    });

    it('getMainUserInfo does not prefix the avatar URL of an already normalized user again', () => {
      const normalized = client.getMainUserInfo({ userId: 'u1', last_name: 'Doe', first_name: 'John', avaUrl: '/ava/1.png' } as any, true);
      const again = client.getMainUserInfo(normalized as any, true);
      expect(again.avaUrl).toBe('http://id.test:8100/ava/1.png');
    });

    it('getBriefUserInfo returns the short user shape', () => {
      const brief = client.getBriefUserInfo({
        userId: 'u1',
        last_name: 'Doe',
        first_name: 'John',
        email: 'a@b.c',
        ipn: '1',
        edrpou: '2',
        avaUrl: '/a.png',
        password: 'hidden',
      });

      expect(brief).toEqual({
        userId: 'u1',
        name: 'Doe John',
        companyName: undefined,
        isLegal: undefined,
        isIndividualEntrepreneur: undefined,
        email: 'a@b.c',
        phone: undefined,
        ipn: '1',
        edrpou: '2',
        avaUrl: 'http://id.test:8100/a.png',
      });
    });

    it('getMainUserInfo returns undefined for an empty user', () => {
      expect(client.getMainUserInfo(undefined)).toBeUndefined();
    });

    it('getMainUserInfo trims names and takes the position from user services', () => {
      const info = client.getMainUserInfo({
        userId: 'u1',
        last_name: ' Doe ',
        first_name: 'John ',
        user_services: [{ provider: 'eds', data: { title: 'CEO', pem: 'PEM', encodeCertSerial: 'S', encodeCert: 'C' } }],
      });

      expect(info).toMatchObject({ name: 'Doe John', lastName: 'Doe', position: 'CEO', pem: 'PEM', encodeCertSerial: 'S', encodeCert: 'C' });
      expect(info?.services).toBeUndefined();
    });

    it('getMainUserInfo takes the position from services.eds for my info', () => {
      const info = client.getMainUserInfo({ userId: 'u1', services: { eds: { data: { title: 'Boss' } } } }, false, true);
      expect(info?.position).toBe('Boss');
    });

    it('getMainUserInfo builds services from user_services when private props are requested', () => {
      const service = { provider: 'ldap', data: {} };

      const info = client.getMainUserInfo({ userId: 'u1', user_services: [service] }, true);

      expect(info?.services).toEqual({ ldap: service, eds: undefined, govid: undefined });
    });

    it('getMainUserInfo uses the person name for legal entities by default', () => {
      const info = client.getMainUserInfo({ userId: 'u1', isLegal: true, companyName: 'ACME', last_name: 'Doe', first_name: 'John' });
      expect(info).toMatchObject({ name: 'Doe John', ceoName: 'Doe John' });
    });

    it('getMainUserInfo uses the company name for legal entities when configured', () => {
      const company = new IdApiClient({ ...baseConfig, legalEntityNameSource: 'company' });

      const info = company.getMainUserInfo({ userId: 'u1', isLegal: true, companyName: 'ACME', last_name: 'Doe', first_name: 'John' });

      expect(info).toMatchObject({ name: 'ACME', ceoName: 'Doe John' });
    });

    it('getMainUserInfo adds the cyrillic IPN when a transliterator is configured', () => {
      const withTranslit = new IdApiClient({ ...baseConfig, ipnTransliterator: { transform: (v) => v, reverse: (v) => `R-${v}` } });

      const info = withTranslit.getMainUserInfo({ userId: 'u1', ipn: 'AB123456' });

      expect(info?.cyrillicIpnPassport).toBe('R-AB123456');
    });

    it('getDatesBetweenTwoDates returns inclusive dates', () => {
      expect(client.getDatesBetweenTwoDates('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    });

    it('concatUserName joins last, first and middle names', () => {
      expect(client.concatUserName({ last_name: 'Doe', first_name: 'John', middle_name: 'M' })).toBe('Doe John M');
    });
  });
});
