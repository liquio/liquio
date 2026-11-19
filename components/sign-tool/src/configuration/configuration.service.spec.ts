import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationService } from './configuration.service';
import { ObservabilityModule } from '../observability/observability.module';

jest.mock('../observability/logger.service', () => {
  return {
    LoggerService: jest.fn().mockImplementation(() => {
      return {
        setContext: jest.fn(),
        printMessages: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      };
    }),
  };
});

const ENV_KEY = 'LIQUIO_CFG_SIGN_TOOL_server';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ObservabilityModule],
      providers: [ConfigurationService],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
  });

  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('loads server config from the configured dir', () => {
    expect(service.get('server')).toMatchObject({ host: 'localhost', port: 3000 });
  });

  it('overrides config from env', () => {
    process.env[ENV_KEY] = '{"port":1}';
    jest.isolateModules(() => {
      const { ConfigurationService: Isolated } = require('./configuration.service');
      const logger = { setContext: jest.fn(), error: jest.fn() };
      expect(new Isolated(logger).get('server').port).toBe(1);
    });
  });

  it('throws sanitized error on invalid env JSON', () => {
    const sentinel = 'SENTINEL_SECRET_VALUE';
    process.env[ENV_KEY] = `{${sentinel}`;
    jest.isolateModules(() => {
      const { ConfigurationService: Isolated } = require('./configuration.service');
      const logger = { setContext: jest.fn(), error: jest.fn() };
      expect(() => new Isolated(logger)).toThrow('Unable to load configuration');
      expect(logger.error).toHaveBeenCalled();
      expect(JSON.stringify(logger.error.mock.calls[0][1].error)).not.toContain(sentinel);
    });
  });
});
