import { publicService, publicServices, sanitizeProviderProfile } from './public_services';

describe('Public provider profiles', () => {
  it('only exposes supported local password status fields without changing the source', () => {
    const service = {
      id: 1,
      userId: 'test-user',
      provider: 'local',
      provider_id: 'test@example.test',
      data: {
        password: 'hash',
        oldPasswords: ['old'],
        resetPasswordToken: 'reset',
        resetPasswordTokenExpireAt: 123,
        isChangeRequired: true,
        passwordExpire: null,
        lastPasswordChangeDate: '2026-10-10',
        futureCredential: 'secret',
      },
    };
    const before = JSON.stringify(service);
    expect(publicService(service).data).toEqual({ isChangeRequired: true, passwordExpire: null, lastPasswordChangeDate: '2026-10-10' });
    expect(JSON.stringify(service)).toBe(before);
  });

  it('removes nested credentials, including arrays and naming variants, while preserving profile metadata', () => {
    const services = {
      govid: {
        provider: 'govid',
        data: {
          surname: 'Test',
          raw: {
            govidAccessToken: 'upstream',
            govidUserId: '123',
            access_token: 'access',
            refresh_token: 'refresh',
            client_secret: 'secret',
            nested: [{ resetPasswordToken: 'reset', givenname: 'User' }],
          },
        },
      },
    };
    const before = JSON.stringify(services);
    expect(publicServices(services).govid.data).toEqual({ surname: 'Test', raw: { govidUserId: '123', nested: [{ givenname: 'User' }] } });
    expect(JSON.stringify(services)).toBe(before);
  });

  it('handles empty data and keeps public certificates', () => {
    expect(publicService({ provider: 'local', data: null }).data).toEqual({});
    expect(sanitizeProviderProfile({ pem: 'public-certificate', encodeCert: 'certificate', private_key: 'key', raw: null })).toEqual({
      pem: 'public-certificate',
      encodeCert: 'certificate',
      raw: null,
    });
  });
});
