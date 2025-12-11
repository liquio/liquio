import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import debug from 'debug';
import nock from 'nock';
import supertest from 'supertest';

import { ConfigurationModule } from '@components/configuration/configuration.module';
import { LoggerService } from '@components/observability/logger.service';
import { ObservabilityModule } from '@components/observability/observability.module';

import { ProvidersModule } from './providers.module';

jest.mock('../configuration/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => {
      if (key === 'services') {
        return {
          exampleService1: {
            isEnabled: true,
            class: 'HttpProvider',
            options: { baseUrl: 'http://example.com', someOption: 'value' },
          },
          exampleService2: {
            isEnabled: false,
            class: 'HttpProvider',
          },
          exampleService3: {
            isEnabled: true,
            class: 'NonexistentProvider',
            options: { anotherOption: 'value' },
          },
        };
      }
      return null;
    }),
  })),
}));

const logMockFn = jest.fn().mockImplementation((...args) => debug('test:log')([...args]));
const warnMockFn = jest.fn().mockImplementation((...args) => debug('test:warn')([...args]));
const errorMockFn = jest.fn().mockImplementation((...args) => debug('test:error')([...args]));
const debugMockFn = jest.fn().mockImplementation((...args) => debug('test:debug')([...args]));

jest.mock('../observability/logger.service', () => ({
  LoggerService: jest.fn().mockImplementation(() => ({
    setContext: jest.fn(),
    log: logMockFn,
    warn: warnMockFn,
    error: errorMockFn,
    debug: debugMockFn,
  })),
}));

describe('ProvidersModule', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ProvidersModule, ConfigurationModule, ObservabilityModule],
      controllers: [],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should create an instance', () => {
    expect(app).toBeTruthy();

    const loggerService = app.get(LoggerService);
    expect(loggerService).toBeDefined();

    expect(logMockFn).toHaveBeenCalledWith('provider-service|loaded', { name: 'exampleService1' });
    expect(warnMockFn).toHaveBeenCalledWith('provider-service|disabled', { name: 'exampleService2' });
    expect(errorMockFn).toHaveBeenCalledWith('provider-service|class-not-found', {
      name: 'exampleService3',
      class: 'NonexistentProvider',
    });
  });

  describe('HTTPProvider', () => {
    it('should call get method correctly', async () => {
      nock('http://example.com').get('/test').reply(200, { success: true, data: 'some response' });

      await supertest(app.getHttpServer())
        .post('/exampleService1/get')
        .send({ extraParams: { url: '/test' } })
        .expect((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ status: 200, data: { success: true, data: 'some response' } });
        });
    });

    it('should call post method correctly', async () => {
      nock('http://example.com').post('/test', {}).reply(201, { success: true });

      await supertest(app.getHttpServer())
        .post('/exampleService1/post')
        .send({ extraParams: { url: '/test', params: {} } })
        .expect((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ status: 201, data: { success: true } });
        });
    });

    it('should call put method correctly', async () => {
      nock('http://example.com').put('/test', {}).reply(200, { success: true });

      await supertest(app.getHttpServer())
        .post('/exampleService1/put')
        .send({ extraParams: { url: '/test', params: {} } })
        .expect((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ status: 200, data: { success: true } });
        });
    });

    it('should call delete method correctly', async () => {
      nock('http://example.com').delete('/test').reply(204);

      await supertest(app.getHttpServer())
        .post('/exampleService1/delete')
        .send({ extraParams: { url: '/test' } })
        .expect((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ status: 204, data: '' });
        });
    });

    it('should call patch method correctly', async () => {
      nock('http://example.com').patch('/test', {}).reply(200, { success: true });

      await supertest(app.getHttpServer())
        .post('/exampleService1/patch')
        .send({ extraParams: { url: '/test', params: {} } })
        .expect((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ status: 200, data: { success: true } });
        });
    });

    it('should handle errors correctly', async () => {
      nock('http://example.com')
        .get('/error')
        .reply(500, { message: 'Internal server error', statusCode: 500 });

      await supertest(app.getHttpServer())
        .post('/exampleService1/get')
        .send({ extraParams: { url: '/error' } })
        .expect((res) => {
          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            status: 500,
            data: {
              message: 'Internal server error',
              statusCode: 500,
            },
          });
        });
    });
  });
});
