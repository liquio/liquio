import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';

import { ConfigurationModule } from '@components/configuration/configuration.module';
import { ObservabilityModule } from '@components/observability/observability.module';

import { CaptchaModule } from './captcha.module';

jest.mock('../configuration/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => {
      if (key === 'captcha') {
        return {
          isEnabled: true,
          isEnabledFor: ['service1.method1', 'service2.*'],
          hmacKey: 'test-hmac-key',
        };
      }
      return null;
    }),
  })),
}));

describe('CaptchaModule', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [CaptchaModule, ConfigurationModule, ObservabilityModule],
      controllers: [],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should create an instance', () => {
    expect(app).toBeTruthy();
  });

  it('should return enabled providers', async () => {
    supertest(app.getHttpServer())
      .get('/captcha/providers/list')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ isEnabledFor: ['service1.method1', 'service2.*'] });
      })
      .end((err) => {
        if (err) throw err;
      });
  });

  it('should return a challenge for a valid service and method', async () => {
    supertest(app.getHttpServer())
      .get('/captcha/service1/method1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('challenge');
        expect(res.body.challenge).toMatchObject({
          algorithm: 'SHA-256',
          challenge: expect.any(String),
          maxnumber: 1000000,
          salt: expect.any(String),
          signature: expect.any(String),
        });
      })
      .end((err) => {
        if (err) throw err;
      });
  });
});
