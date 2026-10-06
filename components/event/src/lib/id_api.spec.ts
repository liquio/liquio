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

  it('should apply the defaults for an empty config', () => {
    const client = initIdApiClient({});

    expect((client as any).config).toMatchObject({ timeout: 30000 });
    expect(client.baseUrl).toBe('http://id-api:8100');
  });

  it('should apply the defaults when the config is not passed', () => {
    const client = initIdApiClient();

    expect((client as any).config).toMatchObject({ timeout: 30000 });
  });

  it('should pass the config values through', () => {
    const routes = { getUserInfo: '/custom/user' };
    const client = initIdApiClient({
      server: 'http://id.local',
      port: 9000,
      timeout: 5000,
      clientId: 'my-client',
      clientSecret: 'secret',
      basicAuthToken: 'dG9rZW4=',
      routes,
    });

    expect((client as any).config).toMatchObject({
      server: 'http://id.local',
      port: 9000,
      timeout: 5000,
      clientId: 'my-client',
      clientSecret: 'secret',
      basicAuthToken: 'dG9rZW4=',
      routes,
    });
    expect(client.baseUrl).toBe('http://id.local:9000');
  });

  it('should give the log of the global scope', () => {
    const client = initIdApiClient({});

    expect((client as any).config.getLog()).toBe((global as any).log);
  });

  it('should return the same client from getIdApiClient()', () => {
    const client = initIdApiClient({ server: 'http://id.local', port: 8100 });

    expect(getIdApiClient()).toBe(client);
  });
});
