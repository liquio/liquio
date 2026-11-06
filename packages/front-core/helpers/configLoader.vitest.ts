import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function respond(body: unknown, status = 200) {
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

describe('runtime configuration', () => {
  it('requires initialization and allows the lazy proxy to be read before loading', async () => {
    const { getConfig, loadConfig } = await import('core/helpers/configLoader');
    const { default: config } = await import('core/config');
    expect(getConfig).toThrow('Configuration not loaded');
    expect(config.backendUrl).toBeUndefined();
    expect(Object.keys(config)).toEqual([]);
    respond({ backendUrl: '/api' });
    await loadConfig();
    expect(config.backendUrl).toBe('/api');
    expect('backendUrl' in config).toBe(true);
    expect(Object.keys(config)).toContain('application');
  });

  it('merges application defaults, preserves extensions, and caches the result', async () => {
    respond({
      application: { name: 'Runtime' },
      features: { custom: true },
      extension: [1, 2],
    });
    const { loadConfig, getConfig } = await import('core/helpers/configLoader');
    const config = await loadConfig({
      application: { name: 'Default', environment: 'dev' },
      features: { old: true },
    });
    expect(config.application).toEqual({ name: 'Runtime', environment: 'dev' });
    expect(config.features).toEqual({ custom: true }); // Other objects remain shallow-merged.
    expect(config.extension).toEqual([1, 2]);
    expect(await loadConfig({ backendUrl: '/different' })).toBe(config);
    expect(getConfig()).toBe(config);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/config.json');
  });

  it.each([
    null,
    [],
    { application: [] },
    { backendUrl: 42 },
    { storageType: 'remote' },
  ])(
    'falls back to defaults for an invalid runtime document: %j',
    async (body) => {
      respond(body);
      const { loadConfig } = await import('core/helpers/configLoader');
      expect(await loadConfig({ backendUrl: '/fallback' })).toEqual({
        backendUrl: '/fallback',
        application: {},
      });
      expect(console.error).toHaveBeenCalled();
    },
  );

  it('retains defaults when the request fails', async () => {
    respond({}, 503);
    const { loadConfig } = await import('core/helpers/configLoader');
    expect(
      (await loadConfig({ application: { name: 'Offline' } })).application.name,
    ).toBe('Offline');
  });

  it('retains defaults for network failures and invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    let loader = await import('core/helpers/configLoader');
    expect(await loader.loadConfig()).toEqual({ application: {} });
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{')));
    loader = await import('core/helpers/configLoader');
    expect(await loader.loadConfig()).toEqual({ application: {} });
  });
});
