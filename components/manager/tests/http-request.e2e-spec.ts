import nock from 'nock';

import { TestApp } from './test-app';
import { HttpRequest } from '../src/lib/http_request';

const BASE_URL = 'http://external.test';

describe('HttpRequest', () => {
  beforeAll(async () => {
    nock.restore();
    nock.activate();
  });

  beforeEach(() => TestApp.beforeEach());
  afterEach(() => TestApp.afterEach());

  afterAll(() => {
    nock.restore();
  });

  it('sends a JSON body and returns the parsed response', async () => {
    nock(BASE_URL, { reqheaders: { 'content-type': 'application/json' } })
      .post('/items', { a: 1 })
      .reply(200, { ok: true });

    const result = await HttpRequest.send({ url: `${BASE_URL}/items`, method: HttpRequest.Methods.POST, body: '{"a":1}' });

    expect(result).toEqual({ ok: true });
  });

  it('sends a non-JSON body as a string and parses a JSON string response', async () => {
    nock(BASE_URL).put('/raw', 'plain').reply(200, '{"done":true}', { 'Content-Type': 'text/plain' });

    const result = await HttpRequest.send({ url: `${BASE_URL}/raw`, method: HttpRequest.Methods.PUT, body: 'plain' });

    expect(result).toEqual({ done: true });
  });

  it('returns a non-JSON string response as is', async () => {
    nock(BASE_URL).get('/text').reply(200, 'hello', { 'Content-Type': 'text/plain' });

    const result = await HttpRequest.send({ url: `${BASE_URL}/text`, method: HttpRequest.Methods.GET });

    expect(result).toBe('hello');
  });

  it('returns the body of an error status response', async () => {
    nock(BASE_URL).get('/missing').reply(404, { error: 'not found' });

    const result = await HttpRequest.send({ url: `${BASE_URL}/missing`, method: HttpRequest.Methods.GET });

    expect(result).toEqual({ error: 'not found' });
  });

  it('throws a clean error on network failure', async () => {
    nock(BASE_URL).get('/down').replyWithError('connection refused');

    await expect(HttpRequest.send({ url: `${BASE_URL}/down`, method: HttpRequest.Methods.GET })).rejects.toThrow('connection refused');
  });

  it('exposes constants', () => {
    expect(HttpRequest.ContentTypes.CONTENT_TYPE_JSON).toBe('application/json');
    expect(HttpRequest.Accepts.ACCEPT_JSON).toBe('application/json');
  });
});
