import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('./configLoader');
  vi.resetModules();
});

describe('checkAccess', () => {
  it('grants access when the user is a head of a required unit', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { default: checkAccess } = await import('helpers/checkAccess');
    expect(checkAccess({ isUserUnitHead: [1] }, {}, [{ id: 1, head: true }])).toBe(true);
    expect(checkAccess({ isUserUnitHead: [1] }, {}, [{ id: 1, head: false }])).toBe(false);
  });

  it('checks unit membership', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { default: checkAccess } = await import('helpers/checkAccess');
    expect(checkAccess({ userHasUnit: 5 }, {}, [{ id: 5 }])).toBe(true);
    expect(checkAccess({ userDoesNotHaveUnit: 5 }, {}, [{ id: 5 }])).toBe(false);
  });

  it('checks admin role from the user info role string', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { default: checkAccess } = await import('helpers/checkAccess');
    expect(checkAccess({ userIsAdmin: true }, { role: 'user;admin' }, [])).toBe(true);
    expect(checkAccess({ userIsAdmin: true }, { role: 'user' }, [])).toBe(false);
  });

  it('checks god-unit membership from config', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({ godUnits: [42] }) }));
    const { default: checkAccess } = await import('helpers/checkAccess');
    expect(checkAccess({ userIsGod: true }, {}, [{ id: 42 }])).toBe(true);
  });

  it('checks the isLegalUser and isEnabled passthrough flags', async () => {
    vi.doMock('./configLoader', () => ({ getConfig: () => ({}) }));
    const { default: checkAccess } = await import('helpers/checkAccess');
    expect(checkAccess({ isLegalUser: true }, { edrpou: '12345678' }, [])).toBe('12345678');
    expect(checkAccess({ isEnabled: true }, {}, [])).toBe(true);
  });
});
