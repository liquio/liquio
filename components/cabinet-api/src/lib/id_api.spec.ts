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

    expect((client as any).config).toMatchObject({ timeout: 30000, canDeleteUser: false });
  });

  it('should apply the defaults when the config is not passed', () => {
    const client = initIdApiClient();

    expect((client as any).config).toMatchObject({ timeout: 30000, canDeleteUser: false });
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
      canDeleteUser: true,
      routes,
    });

    expect((client as any).config).toMatchObject({
      server: 'http://id.local',
      port: 9000,
      timeout: 5000,
      clientId: 'my-client',
      clientSecret: 'secret',
      basicAuthToken: 'dG9rZW4=',
      canDeleteUser: true,
      routes,
    });
  });

  it('should use the company name for legal entities', () => {
    const client = initIdApiClient({ server: 'http://id.local', port: 8100 });

    const user = client.getMainUserInfo({ userId: 'u1', isLegal: true, companyName: 'Acme', last_name: 'Ivanov', first_name: 'Ivan' });

    expect(user?.name).toBe('Acme');
    expect(user?.ceoName).toBe('Ivanov Ivan');
  });

  it('should transliterate the IPN of the user back to cyrillic', () => {
    const client = initIdApiClient({ server: 'http://id.local', port: 8100 });

    const user = client.getMainUserInfo({ userId: 'u1', ipn: 'AB123456' }) as any;

    expect(user.cyrillicIpnPassport).toBe('АБ123456');
  });

  it('should refuse to delete the user unless it is allowed', async () => {
    const client = initIdApiClient({ server: 'http://id.local', port: 8100 });

    await expect(client.deleteUser('u1')).resolves.toEqual({ success: false, message: 'Method is not allowed' });
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
