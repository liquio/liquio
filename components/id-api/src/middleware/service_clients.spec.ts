import crypto from 'crypto';

import { LEGACY_CLIENT_NAME, SERVICE_SCOPES, ServiceClientRegistry } from './service_clients';

const legacy = ['user:pass'];

describe('ServiceClientRegistry', () => {
  const registry = (config: any = {}) =>
    new ServiceClientRegistry({ clients: [{ name: 'task', secret: 's3cret', scopes: ['user:read'] }], ...config }, legacy);

  it('authenticates a named client with its scopes', () => {
    expect(registry().authenticate('task:s3cret')).toEqual({ name: 'task', scopes: ['user:read'], legacy: false });
  });

  it('authenticates a named client by secret_hash', () => {
    const secret_hash = crypto.createHash('sha256').update('hashed').digest('hex');
    const r = new ServiceClientRegistry({ clients: [{ name: 'a', secret_hash, scopes: ['totp'] }] }, []);
    expect(r.authenticate('a:hashed')?.name).toBe('a');
    expect(r.authenticate('a:hash')).toBeUndefined();
  });

  it.each(['task:s3cre', 'task:s3cret2', 'other:s3cret', 'task', 'task:', ':s3cret', ''])('rejects %j', (incoming) => {
    expect(registry().authenticate(incoming)).toBeUndefined();
  });

  it('keeps the legacy shared secret with all scopes, flagged as legacy', () => {
    expect(registry().authenticate('user:pass')).toEqual({ name: LEGACY_CLIENT_NAME, scopes: [...SERVICE_SCOPES], legacy: true });
  });

  it('rejects the legacy secret when allowLegacySharedSecret is false', () => {
    expect(registry({ allowLegacySharedSecret: false }).authenticate('user:pass')).toBeUndefined();
    expect(registry({ allowLegacySharedSecret: false }).authenticate('task:s3cret')?.name).toBe('task');
  });

  it.each([
    [[{ name: '', secret: 'x' }]],
    [[{ name: 'a:b', secret: 'x' }]],
    [[{ name: 'a' }]],
    [
      [
        { name: 'a', secret: 'x' },
        { name: 'a', secret: 'y' },
      ],
    ],
    [[{ name: 'a', secret_hash: 'nothex' }]],
    [[{ name: 'a', secret: 'x', scopes: ['everything'] }]],
  ])('refuses invalid client config %j', (clients) => {
    expect(() => new ServiceClientRegistry({ clients: clients as any }, [])).toThrow();
  });
});
