import { Controller, Get, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import supertest from 'supertest';

import { BasicAuthGuard } from '@common/guards';
import { ConfigurationModule } from '@components/configuration/configuration.module';
import { ConfigurationService } from '@components/configuration/configuration.service';
import { ObservabilityModule } from '@components/observability/observability.module';

import { AuthModule } from './auth.module';

const MockConfigurationService = {
  get: jest.fn((key: string) => {
    if (key === 'auth') {
      return { basicAuthTokens: ['username:password'] };
    }
    return null;
  }),
};

@Controller()
export class AuthController {
  @Get('/test')
  @UseGuards(BasicAuthGuard)
  testEndpoint() {
    return 'Auth module is working';
  }
}

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule, ConfigurationModule, ObservabilityModule],
      controllers: [AuthController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: BasicAuthGuard,
        },
        {
          provide: ConfigurationService,
          useValue: MockConfigurationService,
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should return "Auth module is working" from test endpoint', async () => {
    const app = module.createNestApplication();
    await app.init();

    const response = await supertest(app.getHttpServer()).get('/test').auth('username', 'password');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Auth module is working');
  });

  it('should return 401 for unauthorized access', async () => {
    const app = module.createNestApplication();
    await app.init();

    const response = await supertest(app.getHttpServer()).get('/test');

    expect(response.status).toBe(401);
  });
});
