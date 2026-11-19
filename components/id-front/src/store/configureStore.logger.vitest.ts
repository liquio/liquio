import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig } = vi.hoisted(() => ({ getConfig: vi.fn() }));

vi.mock('../helpers/configLoader', () => ({ getConfig }));

describe('store/configureStore with the real redux-logger', () => {
  let groupCollapsed: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getConfig.mockReturnValue({ APP_ENV: 'development', application: {} });
    groupCollapsed = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
    vi.spyOn(console, 'group').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates the state and logs the dispatched action', async () => {
    const { default: configureStore } = await import('./configureStore');
    const store = configureStore();

    store.dispatch({ type: 'DB_ERROR' });

    expect(store.getState().auth.DBError).toBe(true);
    expect(groupCollapsed).toHaveBeenCalled();
    const logged = groupCollapsed.mock.calls.flat().join(' ');
    expect(logged).toContain('DB_ERROR');
  });

  it('throws on an action with a non-string type', async () => {
    const { default: configureStore } = await import('./configureStore');
    const store = configureStore();

    expect(() => store.dispatch({ type: 42 } as never)).toThrow();
  });

  it('throws on a non-plain-object action', async () => {
    const { default: configureStore } = await import('./configureStore');
    const store = configureStore();

    expect(() => store.dispatch((() => undefined) as never)).toThrow();
  });
});
