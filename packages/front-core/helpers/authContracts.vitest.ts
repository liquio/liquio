import { describe, expect, it } from 'vitest';
import { parseAuthUser, parseLoginResponse } from 'core/helpers/authContracts';

const cabinetUser = {
  userId: 'user-1',
  firstName: 'Олена',
  phone: null,
  authUserRoles: ['user'],
  authUserUnits: { all: ['Residents'], head: [], member: ['Residents'] },
  valid: { email: true, phone: false },
  customProvider: { retained: true },
};

describe('authentication contracts', () => {
  it('preserves cabinet profiles and provider extension data', () => {
    expect(parseAuthUser(cabinetUser)).toBe(cabinetUser);
  });

  it('accepts admin numeric memberships and legacy dictionary memberships', () => {
    const admin = {
      authUserUnitIds: { all: [1000000], head: [1000000], member: [] },
    };
    expect(parseAuthUser(admin)).toBe(admin);
    const legacy = {
      authUserUnits: { all: { 1: 'Residents' }, head: {}, member: {} },
    };
    expect(parseAuthUser(legacy)).toBe(legacy);
  });

  it('accepts authUserRoles/courtIdUserScopes as either an array or the object shape produced by the backend\'s underscore-to-camelCase key conversion', () => {
    const arrayShaped = { authUserRoles: ['admin', 'user'] };
    expect(parseAuthUser(arrayShaped)).toBe(arrayShaped);
    const objectShaped = {
      authUserRoles: { 0: 'admin', 1: 'user' },
      courtIdUserScopes: { 0: 'court-1' },
    };
    expect(parseAuthUser(objectShaped)).toBe(objectShaped);
  });

  it('decodes the existing final-segment base64 format with UTF-8 names', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(cabinetUser));
    const encoded = btoa(
      Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
    );
    expect(parseAuthUser(`legacy.${encoded}`)).toEqual(cabinetUser);
    expect(parseAuthUser(encoded)).toEqual(cabinetUser);
  });

  it.each([
    null,
    [],
    123,
    { firstName: 1 },
    { authUserRoles: 'admin' },
    { authUserUnitIds: { all: ['1'], head: [], member: [] } },
    { authUserUnits: { all: ['Residents'] } },
    { valid: { email: 'true' } },
  ])('rejects malformed profiles: %j', (value) =>
    expect(() => parseAuthUser(value)).toThrow(TypeError),
  );

  it('rejects malformed encoded profiles', () => {
    expect(() => parseAuthUser('not base64!')).toThrow();
    expect(() => parseAuthUser(btoa('not json'))).toThrow();
  });

  it('returns typed login data without discarding additional fields', () => {
    expect(parseLoginResponse({ token: 'test-token', extra: 1 })).toEqual({
      token: 'test-token',
      extra: 1,
    });
  });

  it.each([null, {}, { token: 123 }, { token: '' }, { token: '  ' }])(
    'rejects invalid login tokens: %j',
    (value) => expect(() => parseLoginResponse(value)).toThrow(TypeError),
  );
});
