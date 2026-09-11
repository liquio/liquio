import { describe, expect, it, vi } from 'vitest';
import reducer from 'core/reducers/auth';

vi.mock('actions/auth', () => ({
  AUTH_SET_TOKEN: 'AUTH_SET_TOKEN',
  TOKEN_ERROR: 'TOKEN_ERROR',
}));
vi.mock('helpers/checkAuthPhoneValidation', () => ({ default: vi.fn() }));
vi.mock('helpers/configLoader', () => ({ getConfig: () => ({}) }));

describe('profile contract integration', () => {
  it('stores a validated profile while preserving provider fields', () => {
    const user = { userId: 'user-1', customProvider: { preserved: true } };
    const state = reducer(undefined, {
      type: 'REQUEST_USER_INFO_SUCCESS',
      payload: user,
    });
    expect(state.info).toBe(user);
  });

  it('rejects malformed profile data at the reducer boundary', () => {
    expect(() =>
      reducer(undefined, {
        type: 'REQUEST_USER_INFO_SUCCESS',
        payload: { authUserRoles: 'admin' },
      }),
    ).toThrow(TypeError);
  });
});

describe('auth state transitions', () => {
  it('sets tokens, clears token errors, and preserves unrelated state on logout', () => {
    let state = reducer(undefined, { type: 'TOKEN_ERROR', payload: true });
    state = reducer(state, { type: 'AUTH_SET_TOKEN', payload: 'test-token' });
    expect(state.token).toBe('test-token');
    expect(state.tokenError).toBe(false);
    state = reducer(state, { type: 'REQUEST_USER_INFO_SUCCESS', payload: { userId: 'user-1' } });
    state = reducer(state, { type: 'SET_USER_SETTINGS', payload: { language: 'uk' } });
    const loggedOut = reducer(state, { type: 'LOGOUT' });
    expect(loggedOut.info).toBeNull();
    expect(loggedOut.token).toBeNull();
    expect(loggedOut.settings).toEqual({ language: 'uk' });
    expect(state.info?.userId).toBe('user-1');
  });

  it('merges profile updates and email verification without losing provider data', () => {
    const state = reducer(undefined, {
      type: 'REQUEST_USER_INFO_SUCCESS',
      payload: {
        userId: 'user-1',
        firstName: 'Original',
        valid: { phone: true, email: false },
        providerData: { retained: true },
      },
    });
    const updated = reducer(state, { type: 'UPDATE_USER_INFO', payload: { firstName: 'Updated' } });
    expect(updated.info?.userId).toBe('user-1');
    expect(updated.info?.firstName).toBe('Updated');
    expect(updated.info?.providerData).toEqual({ retained: true });
    const verified = reducer(updated, { type: 'VERIFY_EMAIL_CODE_SUCCESS' });
    expect(verified.info?.valid).toEqual({ phone: true, email: true });
    expect(state.info?.firstName).toBe('Original');
  });

  it('ignores delayed email verification after logout', () => {
    const state = reducer(undefined, { type: 'LOGOUT' });
    expect(reducer(state, { type: 'VERIFY_EMAIL_CODE_SUCCESS' })).toBe(state);
  });

  it('resets auth after a profile request failure and ignores unrelated actions', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const state = reducer(initial, { type: 'AUTH_SET_TOKEN', payload: 'test-token' });
    expect(reducer(state, { type: 'UNRELATED_FEATURE' })).toBe(state);
    expect(reducer(state, { type: 'REQUEST_USER_INFO_FAIL' })).toEqual(initial);
  });

  it('matches cabinet memberships by name and preserves received units', () => {
    const state = reducer(undefined, {
      type: 'REQUEST_USER_INFO_SUCCESS',
      payload: {
        authUserUnits: { all: ['Residents'], head: ['Residents'], member: [] },
      },
    });
    const units = [
      { id: 1, name: 'Residents' },
      { id: 2, name: 'Other' },
    ];
    const updated = reducer(state, { type: 'REQUEST_UNITS_SUCCESS', payload: units });
    expect(updated.units).toBe(units);
    expect(updated.userUnits).toEqual([{ id: 1, name: 'Residents', head: true, member: false }]);
  });

  it('matches admin head membership by numeric ID and applies admin menus', () => {
    const state = reducer(undefined, {
      type: 'REQUEST_USER_INFO_SUCCESS',
      payload: {
        authUserUnitIds: { all: [1000000, 7], head: [1000000], member: [7] },
      },
    });
    const updated = reducer(state, {
      type: 'REQUEST_UNITS_SUCCESS',
      payload: [
        { id: 1000000, name: 'Unit administrators' },
        { id: 7, name: 'Staff' },
        { id: 8, name: 'Other' },
      ],
    });
    expect(updated.userUnits).toHaveLength(2);
    expect(updated.userUnits?.[0]).toMatchObject({
      id: 1000000,
      head: true,
      menuConfig: { roleName: 'Unit admin' },
    });
    expect(updated.userUnits?.[1]).toEqual({ id: 7, name: 'Staff', head: false });
  });

  it('handles units arriving before the profile', () => {
    const state = reducer(undefined, {
      type: 'REQUEST_UNITS_SUCCESS',
      payload: [{ id: 1, name: 'Residents' }],
    });
    expect(state.userUnits).toEqual([]);
    const updated = reducer(state, {
      type: 'REQUEST_USER_INFO_SUCCESS',
      payload: {
        authUserUnits: { all: ['Residents'], head: [], member: ['Residents'] },
      },
    });
    expect(updated.userUnits).toEqual([{ id: 1, name: 'Residents' }]);
  });

  it('loads settings, auth mode and search results', () => {
    let state = reducer(undefined, {
      type: 'REQUEST_USER_SETTINGS_SUCCESS',
      payload: { data: { language: 'en' } },
    });
    state = reducer(state, {
      type: 'REQUEST_AUTH_MODE_SUCCESS',
      payload: { useTwoFactorAuth: true },
    });
    state = reducer(state, {
      type: 'SEARCH_USER_SUCCESS',
      payload: { users: [{ userId: 'user-2' }] },
    });
    expect(state.settings).toEqual({ language: 'en' });
    expect(state.useTwoFactorAuth).toBe(true);
    expect(state.foundUser?.userId).toBe('user-2');
    expect(
      reducer(state, { type: 'SEARCH_USER_SUCCESS', payload: { users: [] } }).foundUser,
    ).toBeUndefined();
    expect(reducer(state, { type: 'TOGGLE_DEBUG_MODE' }).debugMode).toBe(true);
  });

  it.each([
    { type: 'AUTH_SET_TOKEN', payload: 123 },
    { type: 'TOKEN_ERROR', payload: 'true' },
    { type: 'REQUEST_UNITS_SUCCESS', payload: [{ id: '1', name: 'Invalid' }] },
  ])('rejects malformed state payloads: %j', (action) => {
    expect(() => reducer(undefined, action)).toThrow(TypeError);
  });
});
