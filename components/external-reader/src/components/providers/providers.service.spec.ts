import { Test } from '@nestjs/testing';

import { ConfigurationService } from '@components/configuration/configuration.service';
import { LoggerService } from '@components/observability/logger.service';

import { ProvidersService } from './providers.service';

const registryGetMock = jest.fn();
const pluginLoaderLoadMock = jest.fn().mockResolvedValue({ get: registryGetMock });

jest.mock('@liquio/plugin-sdk', () => {
  const actual = jest.requireActual('@liquio/plugin-sdk');
  return {
    ...actual,
    PluginLoader: jest.fn().mockImplementation(() => ({ load: pluginLoaderLoadMock })),
  };
});

const logMockFn = jest.fn();
const warnMockFn = jest.fn();
const errorMockFn = jest.fn();

describe('ProvidersService plugin fallback', () => {
  let servicesConfig: Record<string, { isEnabled: boolean; class: string; options?: unknown }>;

  const buildService = async () => {
    const configGetMock = jest.fn((key: string) => {
      if (key === 'services') return servicesConfig;
      if (key === 'plugins') return { pluginsDir: '/tmp/plugins', plugins: [] };
      return undefined;
    });

    const module = await Test.createTestingModule({
      providers: [
        ProvidersService,
        {
          provide: ConfigurationService,
          useValue: { get: configGetMock },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: logMockFn,
            warn: warnMockFn,
            error: errorMockFn,
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = module.get(ProvidersService);
    await service.onModuleInit();
    return service;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to the plugin registry for a non-built-in provider class', async () => {
    const fakePluginProvider = {
      getMethod: jest.fn((name: string) =>
        name === 'lookup' ? async () => 'plugin-result' : undefined,
      ),
    };
    registryGetMock.mockImplementation((name: string) =>
      name === 'CustomPlugin' ? fakePluginProvider : undefined,
    );

    servicesConfig = {
      pluginService: {
        isEnabled: true,
        class: 'CustomPlugin',
      },
    };

    const service = await buildService();

    expect(pluginLoaderLoadMock).toHaveBeenCalledWith({ pluginsDir: '/tmp/plugins', plugins: [] });
    expect(registryGetMock).toHaveBeenCalledWith('CustomPlugin');

    const method = service.getMethod('pluginService', 'lookup');
    expect(method).toBeDefined();
    await expect(method?.({})).resolves.toBe('plugin-result');
  });

  it('logs an error and skips a class that matches neither built-ins nor the plugin registry', async () => {
    registryGetMock.mockReturnValue(undefined);

    servicesConfig = {
      unknownService: {
        isEnabled: true,
        class: 'TotallyUnknownProvider',
      },
    };

    const service = await buildService();

    expect(errorMockFn).toHaveBeenCalledWith('provider-service|class-not-found', {
      name: 'unknownService',
      class: 'TotallyUnknownProvider',
    });
    expect(service.getMethod('unknownService', 'anything')).toBeUndefined();
  });
});
