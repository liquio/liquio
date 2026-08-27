import { Providers } from './index';

describe('Providers', () => {
  it('should resolve a "plugin" providerType from the pluginRegistry', () => {
    const fakePluginInstance = { send: jest.fn() };
    const pluginRegistry = {
      get: (name) => (name === 'xroad' ? fakePluginInstance : undefined),
    };
    const config = {
      xroad: { providerType: 'plugin', pluginName: 'xroad' },
    };

    const providers = new Providers(config, {}, pluginRegistry);

    expect(providers.xroad).toBe(fakePluginInstance);
  });

  it('should throw when the requested pluginName is unknown', () => {
    const pluginRegistry = {
      get: (name) => (name === 'xroad' ? {} : undefined),
    };
    const config = {
      unknownPlugin: { providerType: 'plugin', pluginName: 'not-registered' },
    };

    expect(() => new Providers(config, {}, pluginRegistry)).toThrow(
      'Unknown or unloaded plugin "not-registered" for external service "unknownPlugin"',
    );
  });

  it('should throw when no pluginRegistry is provided for a "plugin" providerType', () => {
    const config = {
      xroad: { providerType: 'plugin', pluginName: 'xroad' },
    };

    expect(() => new Providers(config, {})).toThrow(
      'Unknown or unloaded plugin "xroad" for external service "xroad"',
    );
  });
});
