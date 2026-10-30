import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from 'helpers/configLoader';
import { loadAuthProviders } from 'helpers/authProvidersLoader';
import ReactDOM from 'react-dom';

vi.mock('helpers/configLoader', () => ({ loadConfig: vi.fn() }));
vi.mock('helpers/authProvidersLoader', () => ({ loadAuthProviders: vi.fn() }));
vi.mock('react-dom', () => ({ default: { render: vi.fn() } }));
vi.mock('./App', () => ({ default: function MockApp() { return null; } }));

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadProviders = vi.mocked(loadAuthProviders);
const mockedRender = vi.mocked(ReactDOM.render);

// The entry runs on import, so each test loads a fresh copy of it.
const runEntry = async () => {
  vi.resetModules();
  await import('./index');
  // `initializeApp` is async and not awaited by the module.
  await vi.waitFor(() => expect(mockedRender.mock.calls.length + (document.getElementById('root')?.innerHTML ? 1 : 0)).toBeGreaterThan(0));
};

describe('index (entry)', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    mockedLoadConfig.mockReset().mockResolvedValue({ application: {} });
    mockedLoadProviders.mockReset().mockResolvedValue([]);
    mockedRender.mockReset();
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('loads the config with the defaults, then the auth providers, then renders App into #root', async () => {
    const order: string[] = [];
    mockedLoadConfig.mockImplementation(async () => {
      order.push('config');
      return { application: {} };
    });
    mockedLoadProviders.mockImplementation(async () => {
      order.push('providers');
      return [];
    });
    mockedRender.mockImplementation(() => {
      order.push('render');
    });
    await runEntry();
    expect(order).toEqual(['config', 'providers', 'render']);
    expect(mockedRender).toHaveBeenCalledTimes(1);
    const [element, container] = mockedRender.mock.calls[0] as unknown as [{ type: { name: string } }, Element];
    expect(element.type.name).toBe('MockApp');
    expect(container).toBe(root);
  });

  it('passes the default configuration to loadConfig', async () => {
    await runEntry();
    expect(mockedLoadConfig).toHaveBeenCalledWith({
      APP_NAME: 'liquio',
      APP_TITLE: 'Liquio',
      APP_ENV: 'development',
      BACKEND_URL: '/',
      BUILD_ID: 'false',
      ONLINE_HELP: false,
      SHOW_PHONE: false,
      SHOW_PHONE_CONFIRM: false,
      FORCE_REGISTER: true,
      defaultLanguage: 'en',
    });
  });

  it('shows a failure message in #root and logs when the config cannot be loaded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedLoadConfig.mockRejectedValue(new Error('boom'));
    await runEntry();
    expect(root.innerHTML).toBe('<div>Failed to load application configuration</div>');
    expect(error).toHaveBeenCalledWith('Failed to initialize app:', expect.any(Error));
    expect(mockedRender).not.toHaveBeenCalled();
    expect(mockedLoadProviders).not.toHaveBeenCalled();
  });

  it('shows the same failure message when loading the providers throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedLoadProviders.mockRejectedValue(new Error('no providers'));
    await runEntry();
    expect(root.innerHTML).toBe('<div>Failed to load application configuration</div>');
    expect(mockedRender).not.toHaveBeenCalled();
  });
});
