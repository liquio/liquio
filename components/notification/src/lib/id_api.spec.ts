import { getIdApiClient, resetIdApiClient } from '@liquio/back-core';

import { initIdApiClient } from './id_api';

describe('initIdApiClient', () => {
  beforeEach(() => {
    resetIdApiClient();
    (global as any).log = { save: jest.fn() };
  });

  afterEach(() => {
    resetIdApiClient();
    delete (global as any).log;
  });

  it('should apply the client defaults for an empty config', () => {
    const client = initIdApiClient({});

    expect(client.baseUrl).toBe('http://id-api:8100');
    expect(client.timeout).toBe(30000);
  });

  it('should apply the client defaults when the config is not passed', () => {
    const client = initIdApiClient();

    expect(client.baseUrl).toBe('http://id-api:8100');
  });

  it('should map the host to the server and not append a port', () => {
    const client = initIdApiClient({ host: 'http://id-api:8100' });

    expect((client as any).config.server).toBe('http://id-api:8100');
    expect(client.baseUrl).toBe('http://id-api:8100');
  });

  it('should append the port only when the config has one', () => {
    const client = initIdApiClient({ host: 'http://id.local', port: 9000 });

    expect(client.baseUrl).toBe('http://id.local:9000');
  });

  it('should not append a port to a host without one', () => {
    const client = initIdApiClient({ host: 'https://id.local' });

    expect(client.baseUrl).toBe('https://id.local');
  });

  it('should pass the timeout through', () => {
    const client = initIdApiClient({ host: 'http://id.local', timeout: 5000 });

    expect(client.timeout).toBe(5000);
  });

  it('should use the basic auth token', async () => {
    const client = initIdApiClient({ host: 'http://id.local', basicAuthToken: 'Basic dG9rZW4=', user: 'u', password: 'p' });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));

    await client.getUsersByCodesRaw(['1']);

    expect((fetchMock.mock.calls[0][1] as any).headers.Authorization).toBe('Basic dG9rZW4=');
    fetchMock.mockRestore();
  });

  it('should fall back to the user and password', async () => {
    const client = initIdApiClient({ host: 'http://id.local', user: 'user', password: 'pass' });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));

    await client.getUsersByCodesRaw(['1']);

    expect((fetchMock.mock.calls[0][1] as any).headers.Authorization).toBe(`Basic ${Buffer.from('user:pass').toString('base64')}`);
    fetchMock.mockRestore();
  });

  it('should give the log of the global scope', () => {
    const client = initIdApiClient({});

    expect((client as any).config.getLog()).toBe((global as any).log);
  });

  it('should return the same client from getIdApiClient()', () => {
    const client = initIdApiClient({ host: 'http://id.local' });

    expect(getIdApiClient()).toBe(client);
  });
});
