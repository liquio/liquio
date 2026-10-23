import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ProvidersLoader = typeof import('./authProvidersLoader');

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

// Both loaders cache at module level, so every test gets fresh modules.
const freshLoaders = async (backendUrl: string | undefined): Promise<ProvidersLoader> => {
  vi.resetModules();
  const { loadConfig } = await import('./configLoader');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no config.json')));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await loadConfig(backendUrl === undefined ? {} : { BACKEND_URL: backendUrl });
  return import('./authProvidersLoader');
};

describe('authProvidersLoader', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getAuthProviders is empty before loading', async () => {
    const { getAuthProviders } = await freshLoaders('/');
    expect(getAuthProviders()).toEqual([]);
  });

  it('loads providers from BACKEND_URL with credentials and caches them', async () => {
    const { loadAuthProviders, getAuthProviders } = await freshLoaders('https://id.example.com');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ providers: [{ type: 'local', id: 'a' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const providers = await loadAuthProviders();

    expect(fetchMock).toHaveBeenCalledWith('https://id.example.com/auth_providers', { credentials: 'include' });
    expect(providers).toEqual([{ type: 'local', id: 'a' }]);
    expect(getAuthProviders()).toBe(providers);
    expect(await loadAuthProviders()).toBe(providers);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not add a second slash when BACKEND_URL ends with one', async () => {
    const { loadAuthProviders } = await freshLoaders('/');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ providers: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await loadAuthProviders();

    expect(fetchMock).toHaveBeenCalledWith('/auth_providers', { credentials: 'include' });
  });

  it('falls back to an empty list when providers is not an array', async () => {
    const { loadAuthProviders } = await freshLoaders('/');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ providers: 'nope' })));

    expect(await loadAuthProviders()).toEqual([]);
  });

  it('falls back to an empty list when the response is not ok', async () => {
    const { loadAuthProviders, getAuthProviders } = await freshLoaders('/');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 500)));

    expect(await loadAuthProviders()).toEqual([]);
    expect(getAuthProviders()).toEqual([]);
  });

  it('falls back to an empty list when the request fails', async () => {
    const { loadAuthProviders } = await freshLoaders('/');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(await loadAuthProviders()).toEqual([]);
  });

  it('falls back to an empty list when BACKEND_URL is missing (the lookup throws and is caught)', async () => {
    const { loadAuthProviders } = await freshLoaders(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await loadAuthProviders()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
