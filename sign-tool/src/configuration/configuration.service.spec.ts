import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationService } from './configuration.service';
import { ObservabilityModule } from '../observability/observability.module';

jest.mock('multiconf', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn().mockReturnValue({
        x509: {
          caCerts: [],
        },
        server: {
          host: 'localhost',
          port: 3000,
          isSwaggerEnabled: true,
          acceptedBodySize: '10mb',
        },
      }),
    },
  };
});

jest.mock('../observability/logger.service', () => {
  return {
    LoggerService: jest.fn().mockImplementation(() => {
      return {
        setContext: jest.fn(),
        printMessages: jest.fn(),
        error: jest.fn(),
      };
    }),
  };
});

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ObservabilityModule],
      providers: [ConfigurationService],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
