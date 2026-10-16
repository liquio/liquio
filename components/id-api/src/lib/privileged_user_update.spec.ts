import { changedPrivilegedFields, checkNamedClientUpdate } from './privileged_user_update';

const client = (...scopes: string[]) => ({ name: 'svc', scopes, legacy: false });

describe('checkNamedClientUpdate (KS-24)', () => {
  it('allows profile fields for a user:write client', () => {
    expect(checkNamedClientUpdate({ gender: 'male', needOnboarding: false }, client('user:write'))).toBeUndefined();
  });

  it.each([{ role: 'admin' }, { isActive: false }, { useTwoFactorAuth: true }, { twoFactorType: 'totp' }])(
    'returns 403 for %j without user:admin',
    (body) => {
      expect(checkNamedClientUpdate(body, client('user:write'), ['admin'])?.status).toBe(403);
    },
  );

  it.each([{ email: 'a@b.test' }, { phone: '380501112233' }])('returns 400 for %j even with user:admin', (body) => {
    expect(checkNamedClientUpdate(body, client('user:admin'))?.status).toBe(400);
  });

  it('checks every role against the allowlist and fails closed without one', () => {
    expect(checkNamedClientUpdate({ role: 'individual;admin' }, client('user:admin'), ['individual', 'admin'])).toBeUndefined();
    expect(checkNamedClientUpdate({ role: 'individual;root' }, client('user:admin'), ['individual', 'admin'])?.status).toBe(400);
    expect(checkNamedClientUpdate({ role: 'admin' }, client('user:admin'))?.status).toBe(400);
    expect(checkNamedClientUpdate({ role: ['admin'] }, client('user:admin'), ['admin'])?.status).toBe(400);
    expect(checkNamedClientUpdate({ role: 'admin;' }, client('user:admin'), ['admin'])?.status).toBe(400);
  });

  it('refuses disabling 2FA', () => {
    expect(checkNamedClientUpdate({ useTwoFactorAuth: false }, client('user:admin'))?.status).toBe(400);
    expect(checkNamedClientUpdate({ useTwoFactorAuth: 'false' }, client('user:admin'))?.status).toBe(400);
    expect(checkNamedClientUpdate({ twoFactorType: null }, client('user:admin'))?.status).toBe(400);
    expect(checkNamedClientUpdate({ useTwoFactorAuth: true, twoFactorType: 'totp' }, client('user:admin'))).toBeUndefined();
  });

  it('lists the privileged fields of a body', () => {
    expect(changedPrivilegedFields({ role: 'a', gender: 'x', isActive: true })).toEqual(['role', 'isActive']);
  });
});
