import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ConfigLoader = typeof import('./configLoader');

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

// The loader caches its config at module level, so every test gets a fresh module.
const freshLoader = async (): Promise<ConfigLoader> => {
  vi.resetModules();
  return import('./configLoader');
};

describe('configLoader', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getConfig throws before loadConfig has run', async () => {
    const { getConfig } = await freshLoader();
    expect(() => getConfig()).toThrow('Configuration not loaded. Call loadConfig() first.');
  });

  it('fetches /config.json and merges it over the defaults', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ APP_TITLE: 'Custom', extra: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const { loadConfig, getConfig } = await freshLoader();

    const config = await loadConfig({ APP_NAME: 'liquio', APP_TITLE: 'Liquio' });

    expect(fetchMock).toHaveBeenCalledWith('/config.json');
    expect(config).toEqual({ APP_NAME: 'liquio', APP_TITLE: 'Custom', extra: 1, application: {} });
    expect(getConfig()).toBe(config);
  });

  it('merges the nested application object key by key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ application: { b: 2, c: 3 } })));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ application: { a: 1, b: 1 } });

    expect(config.application).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('replaces other nested objects instead of merging them (shallow merge)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ variables: { dateFormat: 'YYYY' } })));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ variables: { dateFormat: 'DD', dateTimeFormat: 'DD HH' } });

    expect(config.variables).toEqual({ dateFormat: 'YYYY' });
  });

  it('caches the loaded config and ignores later calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ APP_NAME: 'first' }));
    vi.stubGlobal('fetch', fetchMock);
    const { loadConfig } = await freshLoader();

    const first = await loadConfig({});
    const second = await loadConfig({ APP_NAME: 'other' });

    expect(second).toBe(first);
    expect(second.APP_NAME).toBe('first');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 404)));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ APP_NAME: 'liquio', application: { a: 1 } });

    expect(config).toEqual({ APP_NAME: 'liquio', application: { a: 1 } });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ APP_NAME: 'liquio' });

    expect(config).toEqual({ APP_NAME: 'liquio', application: {} });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults when the body is not valid JSON', async () => {
    const response = { ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token')) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ APP_NAME: 'liquio' });

    expect(config).toEqual({ APP_NAME: 'liquio', application: {} });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults when the JSON is not an object', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(['not', 'an', 'object'])));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ APP_NAME: 'liquio' });

    expect(config).toEqual({ APP_NAME: 'liquio', application: {} });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults when a known field has the wrong type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ BACKEND_URL: 42, APP_NAME: 'ignored' })));
    const { loadConfig } = await freshLoader();

    const config = await loadConfig({ BACKEND_URL: '/' });

    expect(config).toEqual({ BACKEND_URL: '/', application: {} });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('uses an empty config when called without defaults and the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { loadConfig } = await freshLoader();

    expect(await loadConfig()).toEqual({ application: {} });
  });
});
