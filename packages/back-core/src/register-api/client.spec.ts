import { Readable } from 'node:stream';

import { RegisterApiClient, REGISTER_API_DEFAULT_ROUTES } from './client';
import { RegisterApiError } from './errors';
import { runInAsyncLocalStorage } from '../common/async_local_storage';

const BASE = 'http://register.test:8080';
const TOKEN = 'secret-token-value';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  duplex?: string;
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

function parsed(): { path: string; params: URLSearchParams } {
  const url = new URL(lastCall().url);
  return { path: url.pathname, params: url.searchParams };
}

describe('RegisterApiClient', () => {
  let client: RegisterApiClient;
  let log: { save: jest.Mock };

  beforeEach(() => {
    global.fetch = jest.fn();
    log = { save: jest.fn() };
    client = new RegisterApiClient({ server: 'http://register.test', port: 8080, token: TOKEN, getLog: () => log });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('config', () => {
    it('uses defaults', () => {
      const defaults = new RegisterApiClient();

      expect(defaults.baseUrl).toBe('http://register:8080');
      expect(defaults.timeout).toBe(30000);
      expect(defaults.routes).toEqual(REGISTER_API_DEFAULT_ROUTES);
    });

    it('url wins over server and port and loses the trailing slash', () => {
      expect(new RegisterApiClient({ url: 'http://r.test:9/', server: 'http://x', port: 1 }).baseUrl).toBe('http://r.test:9');
    });

    it('does not append a port when only the server is given', () => {
      expect(new RegisterApiClient({ server: 'http://r.test' }).baseUrl).toBe('http://r.test');
    });

    it('appends the port to the server and does not default it with url', () => {
      expect(new RegisterApiClient({ server: 'http://r.test', port: '81' }).baseUrl).toBe('http://r.test:81');
      expect(new RegisterApiClient({ url: 'http://r.test' }).baseUrl).toBe('http://r.test');
    });

    it('overrides routes', () => {
      const custom = new RegisterApiClient({ routes: { getKeys: '/v2/keys' } });

      expect(custom.routes.getKeys).toBe('/v2/keys');
      expect(custom.routes.getRegisters).toBe('/registers');
    });

    it('keeps timeout 0', () => {
      expect(new RegisterApiClient({ timeout: 0 }).timeout).toBe(0);
    });
  });

  describe('headers', () => {
    it('sends token, no access-info by default and no x-trace-id outside a context', async () => {
      mockResponse(200, { data: {} });
      await client.findRegisterById(1);

      const { headers } = lastCall();
      expect(headers.token).toBe(TOKEN);
      expect(headers['access-info']).toBeUndefined();
      expect(headers['x-trace-id']).toBeUndefined();
    });

    it('sends no token when it is not configured', async () => {
      mockResponse(200, { data: {} });
      await new RegisterApiClient({ server: 'http://r.test' }).findRegisterById(1);

      expect(lastCall().headers.token).toBeUndefined();
    });

    it('sends x-trace-id inside an async local storage context', async () => {
      mockResponse(200, { data: {} });
      await new Promise<void>((resolve, reject) => {
        runInAsyncLocalStorage(() => {
          client.findRegisterById(1).then(() => resolve(), reject);
        });
      });

      expect(lastCall().headers['x-trace-id']).toEqual(expect.any(String));
    });

    it('encodes access-info as base64 JSON', async () => {
      const accessInfo = { systemId: 'task', userId: 'u1', extra: { a: 1 } };
      mockResponse(200, { data: {} });
      await client.findRegisterById(1, { accessInfo });

      expect(JSON.parse(Buffer.from(lastCall().headers['access-info'], 'base64').toString('utf8'))).toEqual(accessInfo);
    });

    it('sends JSON content type with a body', async () => {
      mockResponse(200, { data: {} });
      await client.createRegister({ name: 'r' });

      expect(lastCall().headers['Content-Type']).toBe('application/json');
      expect(lastCall().body).toBe(JSON.stringify({ name: 'r' }));
    });
  });

  describe('methods', () => {
    type Case = {
      name: string;
      call: (c: RegisterApiClient) => Promise<any>;
      method: string;
      path: string;
      query?: Record<string, string | string[]>;
      body?: unknown;
    };

    const cases: Case[] = [
      { name: 'getRegisters', call: (c) => c.getRegisters({ limit: 5 }), method: 'GET', path: '/registers', query: { limit: '5' } },
      { name: 'findRegisterById', call: (c) => c.findRegisterById(3), method: 'GET', path: '/registers/3' },
      { name: 'createRegister', call: (c) => c.createRegister({ a: 1 }), method: 'POST', path: '/registers', body: { a: 1 } },
      { name: 'updateRegisterById', call: (c) => c.updateRegisterById(3, { a: 1 }), method: 'PUT', path: '/registers/3', body: { a: 1 } },
      { name: 'deleteRegisterById', call: (c) => c.deleteRegisterById(3), method: 'DELETE', path: '/registers/3' },
      {
        name: 'exportRegister',
        call: (c) => c.exportRegister(3, { withData: true, keyIds: [1, 2] }),
        method: 'GET',
        path: '/registers/3/export',
        query: { with_data: 'true', 'key_ids[]': ['1', '2'] },
      },
      {
        name: 'importRegister',
        call: (c) => c.importRegister({ force: true, rewriteSchema: false, clearRecords: true, addData: true }, { r: 1 }),
        method: 'POST',
        path: '/registers/import',
        query: { force: 'true', rewrite_schema: 'false', clear_records: 'true', add_data: 'true' },
        body: { r: 1 },
      },
      { name: 'getKeys', call: (c) => c.getKeys({ register_id: 1 }), method: 'GET', path: '/keys', query: { register_id: '1' } },
      { name: 'findKeyById', call: (c) => c.findKeyById(4), method: 'GET', path: '/keys/4' },
      { name: 'getSyncedKeys array', call: (c) => c.getSyncedKeys([1, 2]), method: 'GET', path: '/keys/synced', query: { ids: '1,2' } },
      { name: 'getSyncedKeys string', call: (c) => c.getSyncedKeys('1,2'), method: 'GET', path: '/keys/synced', query: { ids: '1,2' } },
      { name: 'getAllSyncedKeys', call: (c) => c.getAllSyncedKeys(), method: 'GET', path: '/keys/allSynced' },
      { name: 'createKey', call: (c) => c.createKey({ k: 1 }), method: 'POST', path: '/keys', body: { k: 1 } },
      { name: 'updateKeyById', call: (c) => c.updateKeyById(4, { k: 1 }), method: 'PUT', path: '/keys/4', body: { k: 1 } },
      { name: 'deleteKeyById', call: (c) => c.deleteKeyById(4), method: 'DELETE', path: '/keys/4' },
      {
        name: 'updateKeyIndexMapping',
        call: (c) => c.updateKeyIndexMapping(4, { m: 1 }),
        method: 'PUT',
        path: '/keys/4/mapping',
        body: { mapping: { m: 1 } },
      },
      { name: 'reindexKey', call: (c) => c.reindexKey(4), method: 'POST', path: '/keys/4/reindex' },
      {
        name: 'afterHandlersReindexKey',
        call: (c) => c.afterHandlersReindexKey(4, { x: 1 }),
        method: 'POST',
        path: '/keys/4/afterhandlers-reindex',
        body: { x: 1 },
      },
      { name: 'getKeyHistory', call: (c) => c.getKeyHistory(4, { offset: 1 }), method: 'GET', path: '/keys/4/history', query: { offset: '1' } },
      { name: 'getRecords', call: (c) => c.getRecords({ key_id: 4 }), method: 'GET', path: '/records', query: { key_id: '4' } },
      { name: 'getRecordsByPost', call: (c) => c.getRecordsByPost({ f: 1 }), method: 'POST', path: '/records-by-post', body: { f: 1 } },
      {
        name: 'getFilteredRecords',
        call: (c) => c.getFilteredRecords({ key_id: 4 }, { f: 1 }),
        method: 'POST',
        path: '/records/filter',
        query: { key_id: '4' },
        body: { f: 1 },
      },
      { name: 'getFilteredRecords default body', call: (c) => c.getFilteredRecords(), method: 'POST', path: '/records/filter', body: {} },
      { name: 'findRecordById', call: (c) => c.findRecordById('r1'), method: 'GET', path: '/records/r1' },
      { name: 'createRecord', call: (c) => c.createRecord({ d: 1 }), method: 'POST', path: '/records', body: { d: 1 } },
      { name: 'updateRecordById', call: (c) => c.updateRecordById('r1', { d: 1 }), method: 'PUT', path: '/records/r1', body: { d: 1 } },
      {
        name: 'importBulkRecords',
        call: (c) => c.importBulkRecords({ registerId: 1, keyId: 2, records: [{ a: 1 }], background: true }),
        method: 'POST',
        path: '/records/bulk',
        body: { registerId: 1, keyId: 2, background: true, records: [{ a: 1 }] },
      },
      {
        name: 'deleteBulkRecords',
        call: (c) => c.deleteBulkRecords({ registerId: 1, keyId: 2, skipRecordIds: ['a'] }),
        method: 'DELETE',
        path: '/records/bulk',
        body: { registerId: 1, keyId: 2, skipRecordIds: ['a'] },
      },
      {
        name: 'getRecordHistory',
        call: (c) => c.getRecordHistory('r1', { limit: 2 }),
        method: 'GET',
        path: '/records/r1/history',
        query: { limit: '2' },
      },
      {
        name: 'getAccessLog',
        call: (c) => c.getAccessLog({ key_id: 4, offset: 0 }),
        method: 'GET',
        path: '/access-log',
        query: { key_id: '4', offset: '0' },
      },
      {
        name: 'startRollback',
        call: (c) => c.startRollback({ keyId: 4, timePoint: 't' }),
        method: 'POST',
        path: '/rollback/start',
        body: { keyId: 4, timePoint: 't' },
      },
      { name: 'getRollbackStatus', call: (c) => c.getRollbackStatus(9), method: 'GET', path: '/rollback/9/status' },
      {
        name: 'rollbackRecord',
        call: (c) => c.rollbackRecord({ historyId: 1, recordId: 'r1', keyId: 4 }),
        method: 'POST',
        path: '/rollback/record',
        body: { historyId: 1, recordId: 'r1', keyId: 4 },
      },
    ];

    it.each(cases)('$name', async ({ call, method, path, query, body }) => {
      mockResponse(200, { data: { ok: true } });
      await call(client);

      const request = lastCall();
      expect(request.method).toBe(method);
      expect(parsed().path).toBe(path);
      if (query) {
        for (const [key, value] of Object.entries(query)) {
          expect(Array.isArray(value) ? parsed().params.getAll(key) : parsed().params.get(key)).toEqual(value);
        }
      } else {
        expect(new URL(request.url).search).toBe('');
      }
      if (body !== undefined) {
        expect(JSON.parse(request.body)).toEqual(body);
      } else {
        expect(request.body).toBeUndefined();
      }
    });

    it('returns data for data methods and undefined when there is no data', async () => {
      mockResponse(200, { data: { id: 1 }, meta: {} });
      expect(await client.findRegisterById(1)).toEqual({ id: 1 });
      mockResponse(200, { meta: {} });
      expect(await client.findRegisterById(1)).toBeUndefined();
      mockResponse(200, 'plain');
      expect(await client.findRegisterById(1)).toBeUndefined();
    });

    it('returns the whole body for body methods', async () => {
      const body = { data: [{ id: 1 }], meta: { count: 1 } };
      mockResponse(200, body);
      expect(await client.getRecords()).toEqual(body);
      mockResponse(200, body);
      expect(await client.getRegisters()).toEqual(body);
      mockResponse(200, body);
      expect(await client.exportRegister(1)).toEqual(body);
      mockResponse(200, body);
      expect(await client.getAccessLog({ key_id: 1 })).toEqual(body);
    });

    it('searchRecords sends limit and offset only when integers', async () => {
      mockResponse(200, { data: [] });
      await client.searchRecords({ keyId: 1, text: 'a b&c', limit: 10, offset: 0 });
      expect(parsed().params.get('key_id')).toBe('1');
      expect(parsed().params.get('text')).toBe('a b&c');
      expect(parsed().params.get('limit')).toBe('10');
      expect(parsed().params.get('offset')).toBe('0');

      mockResponse(200, { data: [] });
      await client.searchRecords({ keyId: 1, text: 'a', limit: 1.5 });
      expect(parsed().params.has('limit')).toBe(false);
      expect(parsed().params.has('offset')).toBe(false);
    });

    it('deleteRecordById sends the person only when both fields are set and a body when given', async () => {
      mockResponse(200, { data: {} });
      await client.deleteRecordById('r1', { person: { id: 'p1', name: 'N' }, body: { why: 'x' } });
      expect(parsed().params.get('personId')).toBe('p1');
      expect(parsed().params.get('personName')).toBe('N');
      expect(JSON.parse(lastCall().body)).toEqual({ why: 'x' });

      mockResponse(200, { data: {} });
      await client.deleteRecordById('r1', { person: { id: 'p1', name: '' } });
      expect(new URL(lastCall().url).search).toBe('');
      expect(lastCall().body).toBeUndefined();
    });

    it('encodes path parameters', async () => {
      mockResponse(200, { data: {} });
      await client.findRecordById('a/b?c');

      expect(lastCall().url).toBe(`${BASE}/records/a%2Fb%3Fc`);
    });

    it('uses route overrides', async () => {
      const custom = new RegisterApiClient({ url: BASE, routes: { findKeyById: '/v2/keys/:id' } });
      mockResponse(200, { data: {} });
      await custom.findKeyById(1);

      expect(lastCall().url).toBe(`${BASE}/v2/keys/1`);
    });
  });

  describe('query builder', () => {
    it('skips undefined, null and empty objects', async () => {
      mockResponse(200, { data: [] });
      await client.getRecords({ a: undefined, b: null, c: {}, d: 'x' });

      expect(new URL(lastCall().url).search).toBe('?d=x');
    });

    it('serializes arrays, bracket keys and JSON objects', async () => {
      mockResponse(200, { data: [] });
      await client.getRecords({
        ids: [1, 'b'],
        data_like: { name: 'x', nested: { a: 1 }, list: [1, 2], none: null, undef: undefined },
        sort: { id: 'desc' },
        other: { a: 1 },
        flag: false,
      });

      const { params } = parsed();
      expect(params.getAll('ids[]')).toEqual(['1', 'b']);
      expect(params.get('data_like[name]')).toBe('x');
      expect(params.get('data_like[nested]')).toBe('{"a":1}');
      expect(params.get('data_like[list]')).toBe('[1,2]');
      expect(params.has('data_like[none]')).toBe(false);
      expect(params.has('data_like[undef]')).toBe(false);
      expect(params.get('sort[id]')).toBe('desc');
      expect(params.get('other')).toBe('{"a":1}');
      expect(params.get('flag')).toBe('false');
    });

    it('round-trips special characters', async () => {
      const value = 'a&b+c#d=e f';
      mockResponse(200, { data: [] });
      await client.getRecords({ q: value, data: { k: value } });

      expect(parsed().params.get('q')).toBe(value);
      expect(parsed().params.get('data[k]')).toBe(value);
    });

    // parameter smuggling through object keys
    it('keeps a hostile key of a bracket object inside one parameter', async () => {
      const keys = ['created_at]=asc&allow_see_all_records=true&z', 'created_at%5D=asc&allow_see_all_records=1&z'];

      for (const key of keys) {
        mockResponse(200, { data: [] });
        await client.getRecords({ key_id: 1, sort: { [key]: 'asc' } });

        const { params } = parsed();
        expect(params.has('allow_see_all_records')).toBe(false);
        expect([...params.keys()].filter((k) => k.startsWith('sort['))).toEqual([`sort[${key}]`]);
        expect(params.get(`sort[${key}]`)).toBe('asc');

        const { search } = new URL(lastCall().url);
        expect(search).not.toContain('&allow_see_all_records');
        expect(search).toContain('%26allow_see_all_records%3D');
      }
    });

    it('encodes hostile keys of every bracket object', async () => {
      for (const name of ['data', 'data_like', 'data_date_from', 'data_date_to']) {
        mockResponse(200, { data: [] });
        await client.getRecords({ key_id: 1, [name]: { 'x]=1&allow_see_all_records=true&y': 'v' } });

        expect(parsed().params.has('allow_see_all_records')).toBe(false);
      }
    });

    it('does not add allow_tokens for an empty array', async () => {
      mockResponse(200, { data: [] });
      await client.getRecords({ key_id: 1, allow_tokens: [] });

      expect(new URL(lastCall().url).search).not.toContain('allow_tokens');
    });
  });

  describe('timeouts', () => {
    it('uses the client timeout by default', async () => {
      const spy = jest.spyOn(AbortSignal, 'timeout');
      mockResponse(200, { data: {} });
      await client.findRegisterById(1);

      expect(spy).toHaveBeenCalledWith(30000);
      spy.mockRestore();
    });

    it('prefers the call timeout and 0 disables it', async () => {
      const spy = jest.spyOn(AbortSignal, 'timeout');
      mockResponse(200, { data: {} });
      await client.findRegisterById(1, { timeout: 5 });
      expect(spy).toHaveBeenCalledWith(5);

      spy.mockClear();
      mockResponse(200, { data: {} });
      await client.findRegisterById(1, { timeout: 0 });
      expect(spy).not.toHaveBeenCalled();
      expect(lastCall().signal).toBeUndefined();
      spy.mockRestore();
    });

    it('importBulkRecords defaults to twice the client timeout and 0 stays 0', async () => {
      const spy = jest.spyOn(AbortSignal, 'timeout');
      mockResponse(200, { data: {} });
      await client.importBulkRecords({ registerId: 1, keyId: 2, records: [] });
      expect(spy).toHaveBeenCalledWith(60000);

      spy.mockClear();
      mockResponse(200, { data: {} });
      await new RegisterApiClient({ url: BASE, timeout: 0 }).importBulkRecords({ registerId: 1, keyId: 2, records: [] });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('errors', () => {
    it('maps a register error body', async () => {
      const body = { error: { message: 'Not found', details: { id: 1 }, code: 404 }, traceId: 't' };
      mockResponse(404, body);

      const error: RegisterApiError = await client.findRecordById('x').catch((e) => e);

      expect(error).toBeInstanceOf(RegisterApiError);
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('HTTP_ERROR');
      expect(error.details).toEqual({ id: 1 });
      expect(error.responseCode).toBe(404);
      expect(error.body).toEqual(body);
    });

    it('uses a text body, a JSON body and a status message', async () => {
      mockResponse(502, 'Bad gateway');
      expect((await client.getRecords().catch((e) => e)).message).toBe('Bad gateway');

      mockResponse(400, { foo: 'bar' });
      expect((await client.getRecords().catch((e) => e)).message).toBe('{"foo":"bar"}');

      mockResponse(500, '');
      expect((await client.getRecords().catch((e) => e)).message).toBe('Register responded with status 500.');
    });

    it('maps a network error using the cause message', async () => {
      const failure = Object.assign(new TypeError('fetch failed'), { cause: new Error('connect ECONNREFUSED 1.2.3.4:8080') });
      (global.fetch as jest.Mock).mockRejectedValueOnce(failure);

      const error: RegisterApiError = await client.getRecords().catch((e) => e);

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toContain('ECONNREFUSED');
      expect((error as any).cause).toBe(failure);
    });

    it('maps a network error without a cause', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      expect((await client.getRecords().catch((e) => e)).message).toBe('boom');
    });

    it('maps a timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));

      const error: RegisterApiError = await client.getRecords(undefined, { timeout: 7 }).catch((e) => e);

      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Register request timed out after 7ms.');
    });

    it('does not log tokens, access-info or query strings', async () => {
      mockResponse(500, { error: { message: 'bad' } });
      await client.getRecords({ ipn: '1234567890' }, { accessInfo: { userId: 'secret-user' } }).catch(() => undefined);

      expect(log.save).toHaveBeenCalled();
      const logged = JSON.stringify(log.save.mock.calls);
      expect(logged).not.toContain(TOKEN);
      expect(logged).not.toContain('secret-user');
      expect(logged).not.toContain('1234567890');
      expect(logged).not.toContain(Buffer.from(JSON.stringify({ userId: 'secret-user' })).toString('base64'));
      expect(logged).toContain('register-api-getRecords-error');
      expect(logged).toContain('/records');
    });

    it('never throws from logging', async () => {
      const broken = new RegisterApiClient({
        url: BASE,
        getLog: () => ({
          save: () => {
            throw new Error('x');
          },
        }),
      });
      mockResponse(200, { data: 1 });

      await expect(broken.findRegisterById(1)).resolves.toBe(1);
    });

    it('uses global.log when no getLog is configured', async () => {
      const save = jest.fn();
      (global as any).log = { save };
      mockResponse(200, { data: 1 });
      await new RegisterApiClient({ url: BASE }).findRegisterById(1);
      delete (global as any).log;

      expect(save).toHaveBeenCalledWith('register-api-findRegisterById-response', expect.objectContaining({ status: 200 }), undefined);
    });
  });

  describe('streams', () => {
    async function read(stream: Readable): Promise<string> {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString('utf8');
    }

    it('exportRegisterFile returns a readable stream', async () => {
      mockResponse(200, 'file-content', { 'content-type': 'application/json' });
      const result = await client.exportRegisterFile(3, { withData: true, keyIds: '1,2' });

      expect(result.status).toBe(200);
      expect(result.headers['content-type']).toBe('application/json');
      expect(await read(result.stream)).toBe('file-content');
      expect(parsed().path).toBe('/registers/3/export');
      expect(parsed().params.get('file')).toBe('true');
      expect(parsed().params.get('with_data')).toBe('true');
      expect(parsed().params.get('key_ids')).toBe('1,2');
    });

    it('exportFilteredRecordsCsv posts without a body', async () => {
      mockResponse(200, 'a,b');
      const result = await client.exportFilteredRecordsCsv({ csv_map: { a: 'A' }, no_limit: true });

      expect(await read(result.stream)).toBe('a,b');
      expect(lastCall().method).toBe('POST');
      expect(parsed().path).toBe('/records/filter');
      expect(parsed().params.get('csv_map')).toBe('{"a":"A"}');
      expect(parsed().params.get('no_limit')).toBe('true');
      expect(lastCall().body).toBeUndefined();
    });

    it('streamExportRegister passes with_data and file', async () => {
      mockResponse(200, 'x');
      await client.streamExportRegister(3, { withData: true, file: true });

      expect(parsed().path).toBe('/registers/3/stream-export');
      expect(parsed().params.get('with_data')).toBe('true');
      expect(parsed().params.get('file')).toBe('true');
    });

    it('throws RegisterApiError for a non-2xx stream response', async () => {
      mockResponse(404, { error: { message: 'No register', code: 'X' } });

      const error: RegisterApiError = await client.exportRegisterFile(3).catch((e) => e);

      expect(error).toBeInstanceOf(RegisterApiError);
      expect(error.status).toBe(404);
      expect(error.message).toBe('No register');
    });

    it('throws when a 2xx stream response has no body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(new Response(null, { status: 204 }));

      const error: RegisterApiError = await client.streamExportRegister(3).catch((e) => e);

      expect(error).toBeInstanceOf(RegisterApiError);
      expect(error.message).toBe('Register responded without a body.');
    });

    it('importRegisterFile streams the body with duplex half', async () => {
      mockResponse(200, { data: {} });
      const body = Readable.from([Buffer.from('abc')]);
      await client.importRegisterFile({ force: true }, body);

      const request = lastCall();
      expect(request.duplex).toBe('half');
      expect(request.headers['Content-Type']).toBe('application/octet-stream');
      expect(request.body).toBeDefined();
      expect(request.method).toBe('POST');
      expect(parsed().path).toBe('/registers/import');
      expect(parsed().params.get('file')).toBe('true');
      expect(parsed().params.get('force')).toBe('true');
    });

    it('streamImportRegister streams the body with duplex half', async () => {
      mockResponse(200, { data: {} });
      await client.streamImportRegister({ clearRecords: true }, Readable.from([Buffer.from('abc')]));

      expect(lastCall().duplex).toBe('half');
      expect(parsed().path).toBe('/registers/stream-import');
      expect(parsed().params.get('clear_records')).toBe('true');
    });

    it('clears the stream timeout once headers are received', async () => {
      jest.useFakeTimers();
      mockResponse(200, 'x');
      await client.streamExportRegister(3, {}, { timeout: 1000 });

      expect(jest.getTimerCount()).toBe(0);
      expect(lastCall().signal?.aborted).toBe(false);
    });

    it('aborts a stream request when headers do not arrive in time', async () => {
      jest.useFakeTimers();
      (global.fetch as jest.Mock).mockImplementationOnce(
        (_url: string, init: any) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }),
      );

      const pending = client.streamExportRegister(3, {}, { timeout: 1000 }).catch((e) => e);
      jest.advanceTimersByTime(1000);
      const error: RegisterApiError = await pending;

      expect(error.code).toBe('TIMEOUT');
    });

    it('sets no stream timeout when it is 0', async () => {
      mockResponse(200, 'x');
      await client.streamExportRegister(3, {}, { timeout: 0 });

      expect(lastCall().signal).toBeUndefined();
    });
  });

  describe('sendPingRequest', () => {
    it('returns the headers and body from the authorized ping', async () => {
      mockResponse(200, { ok: true }, { version: '1.2.3', customer: 'c', environment: 'e' });
      const result = await client.sendPingRequest();

      expect(result).toEqual({ version: '1.2.3', customer: 'c', environment: 'e', body: { ok: true } });
      expect(parsed().path).toBe('/test/ping_with_auth');
      expect(lastCall().headers.token).toBe(TOKEN);
    });

    it('uses /test/ping without a token when withAuth is false', async () => {
      mockResponse(200, 'pong');
      const result = await client.sendPingRequest({ withAuth: false });

      expect(result?.body).toBe('pong');
      expect(parsed().path).toBe('/test/ping');
      expect(lastCall().headers.token).toBeUndefined();
    });

    it('returns undefined and logs on failure', async () => {
      mockResponse(500, { error: { message: 'down' } });

      expect(await client.sendPingRequest()).toBeUndefined();
      expect(log.save).toHaveBeenCalledWith('register-api-ping-error', { message: 'down' }, undefined);
    });

    it('returns undefined on a network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      expect(await client.sendPingRequest()).toBeUndefined();
    });
  });
});
