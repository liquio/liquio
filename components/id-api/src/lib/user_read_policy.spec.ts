import {
  clampLimit,
  DEFAULT_USERS_MAX_BATCH,
  DEFAULT_USERS_MAX_LIMIT,
  getUsersReadPolicy,
  hasFullRead,
  minimiseUser,
  toNonNegativeInt,
} from './user_read_policy';

describe('user_read_policy (KS-25)', () => {
  const policy = getUsersReadPolicy({ users: { fullReadClients: ['admin-api'] } });

  it('uses safe defaults and ignores invalid config', () => {
    expect(getUsersReadPolicy(undefined)).toEqual({ maxLimit: DEFAULT_USERS_MAX_LIMIT, maxBatch: DEFAULT_USERS_MAX_BATCH, fullReadClients: [] });
    expect(getUsersReadPolicy({ users: { maxLimit: -5, maxBatch: 'x' as any, fullReadClients: 'a' as any } })).toMatchObject({
      maxLimit: DEFAULT_USERS_MAX_LIMIT,
      maxBatch: DEFAULT_USERS_MAX_BATCH,
      fullReadClients: [],
    });
    expect(getUsersReadPolicy({ users: { maxLimit: 20, maxBatch: 50 } })).toMatchObject({ maxLimit: 20, maxBatch: 50 });
  });

  it('clamps the page size', () => {
    expect(clampLimit(100000, 20, 100)).toBe(100);
    expect(clampLimit('7', 20, 100)).toBe(7);
    expect(clampLimit(undefined, 20, 100)).toBe(20);
    expect(clampLimit(-1, 20, 100)).toBe(20);
    expect(clampLimit(0, 20, 100)).toBe(1);
    expect(clampLimit('abc', 500, 100)).toBe(100);
  });

  it('accepts only non-negative integers for offset', () => {
    expect(toNonNegativeInt(5, 0)).toBe(5);
    expect(toNonNegativeInt('5', 0)).toBe(5);
    expect(toNonNegativeInt(-5, 0)).toBe(0);
    expect(toNonNegativeInt(1.5, 0)).toBe(0);
    expect(toNonNegativeInt('', 0)).toBe(0);
    expect(toNonNegativeInt(null, 3)).toBe(3);
  });

  it('gives full read to the legacy secret and listed clients only', () => {
    expect(hasFullRead({ name: 'legacy-shared-secret', legacy: true }, policy)).toBe(true);
    expect(hasFullRead({ name: 'admin-api', legacy: false }, policy)).toBe(true);
    expect(hasFullRead({ name: 'cabinet', legacy: false }, policy)).toBe(false);
    expect(hasFullRead(undefined, policy)).toBe(true);
  });

  it('never returns the password hash and drops services without full read', () => {
    const user = { userId: 'u1', email: 'a@b.c', password: 'hash', authorizationVersion: 3, services: { eds: {} } };
    expect(minimiseUser(user, true)).toEqual({ userId: 'u1', email: 'a@b.c', services: { eds: {} } });
    expect(minimiseUser(user, false)).toEqual({ userId: 'u1', email: 'a@b.c' });
    expect(user.password).toBe('hash');
  });
});
