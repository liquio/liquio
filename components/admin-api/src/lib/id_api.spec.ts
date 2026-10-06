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

    expect((client as any).config).toMatchObject({
      server: 'http://id-api',
      port: 8100,
      timeout: 30000,
      clientId: 'admin-api',
    });
  });

  it('should apply the defaults when the config is not passed', () => {
    const client = initIdApiClient();

    expect((client as any).config).toMatchObject({ server: 'http://id-api', port: 8100 });
  });

  it('should pass the config values through', () => {
    const routes = { getUser: '/custom/user' };
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
  });

  it('should give the log of the global scope', () => {
    const client = initIdApiClient({});

    expect((client as any).config.getLog()).toBe((global as any).log);
  });

  it('should make getIdApiClient return the same client without arguments', () => {
    const client = initIdApiClient({});

    expect(getIdApiClient()).toBe(client);
  });
});
