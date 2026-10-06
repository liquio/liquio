import { describe, expect, it } from 'vitest';
import auth from './auth';

const initial = { DBError: false, ERROR_503: false };

describe('reducers/auth', () => {
  it('starts without errors', () => {
    expect(auth(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('returns the same state for unknown actions', () => {
    const state = { ...initial, user: 'u' };
    expect(auth(state, { type: 'SOMETHING_ELSE', payload: 1 })).toBe(state);
  });

  describe('GET_AUTH_SUCCESS', () => {
    it('merges the payload into the state and clears DBError', () => {
      const state = { DBError: true, ERROR_503: true, stale: 1 };
      const next = auth(state, {
        type: 'GET_AUTH_SUCCESS',
        payload: { user: { id: 1 }, twoFactorAuthNeeded: true, redirect: '/x' },
      });
      expect(next).toEqual({
        DBError: false,
        ERROR_503: true,
        stale: 1,
        user: { id: 1 },
        twoFactorAuthNeeded: true,
        redirect: '/x',
      });
    });

    it('lets the payload override ERROR_503 but never DBError (stored as is, not validated)', () => {
      const next = auth(initial, { type: 'GET_AUTH_SUCCESS', payload: { DBError: true, ERROR_503: 'yes' } });
      expect(next).toEqual({ DBError: false, ERROR_503: 'yes' });
    });

    it('accepts a missing payload', () => {
      expect(auth(initial, { type: 'GET_AUTH_SUCCESS' })).toEqual(initial);
    });
  });

  it('GET_AUTH_FAIL sets DBError and keeps the rest', () => {
    expect(auth({ ...initial, user: 1 }, { type: 'GET_AUTH_FAIL' })).toEqual({ ...initial, user: 1, DBError: true });
  });

  it('DB_ERROR sets DBError whatever the payload is', () => {
    expect(auth(initial, { type: 'DB_ERROR', payload: false })).toEqual({ ...initial, DBError: true });
  });

  it('ERROR_503 stores the payload in ERROR_503', () => {
    expect(auth(initial, { type: 'ERROR_503', payload: true })).toEqual({ ...initial, ERROR_503: true });
  });

  it('does not mutate the previous state', () => {
    const state = Object.freeze({ ...initial });
    expect(() => auth(state, { type: 'GET_AUTH_SUCCESS', payload: { a: 1 } })).not.toThrow();
  });
});
