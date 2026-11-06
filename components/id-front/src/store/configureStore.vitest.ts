import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, createLogger } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  createLogger: vi.fn(),
}));

vi.mock('../helpers/configLoader', () => ({ getConfig }));
vi.mock('redux-logger', () => ({ createLogger }));

describe('store/configureStore', () => {
  beforeEach(() => {
    createLogger.mockReset();
    createLogger.mockReturnValue(() => (next: (action: unknown) => unknown) => (action: unknown) => next(action));
  });

  it('adds the collapsed logger outside production', async () => {
    getConfig.mockReturnValue({ APP_ENV: 'development', application: {} });
    const { default: configureStore } = await import('./configureStore');

    const store = configureStore();

    expect(createLogger).toHaveBeenCalledWith({ collapsed: true });
    expect(store.getState().auth).toEqual({ DBError: false, ERROR_503: false });
  });

  it('adds the logger when APP_ENV is not set', async () => {
    getConfig.mockReturnValue({ application: {} });
    const { default: configureStore } = await import('./configureStore');

    configureStore();

    expect(createLogger).toHaveBeenCalledTimes(1);
  });

  it('has no logger in production', async () => {
    getConfig.mockReturnValue({ APP_ENV: 'production', application: {} });
    const { default: configureStore } = await import('./configureStore');

    const store = configureStore();

    expect(createLogger).not.toHaveBeenCalled();
    store.dispatch({ type: 'DB_ERROR' });
    expect(store.getState().auth.DBError).toBe(true);
  });

  it('throws when the config was not loaded', async () => {
    getConfig.mockImplementation(() => {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    });
    const { default: configureStore } = await import('./configureStore');

    expect(() => configureStore()).toThrow('Configuration not loaded');
  });
});
