import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationService } from './configuration.service';
import { ObservabilityModule } from '../observability/observability.module';

jest.mock('../observability/logger.service', () => {
  return {
    LoggerService: jest.fn().mockImplementation(() => {
      return {
        setContext: jest.fn(),
        printMessages: jest.fn(),
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
