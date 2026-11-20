import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { createE2eApp, setConfig, TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from './helpers/create-app';

describe('App setup (e2e)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('GET /test/ping returns the transform envelope', async () => {
    app = await createE2eApp();
    const res = await request(app.getHttpServer()).get('/test/ping').expect(200);
    expect(res.body).toEqual({ data: { processPid: expect.any(Number), message: 'pong' } });
  });

  it('GET /captcha/providers/list is public', async () => {
    app = await createE2eApp();
    await request(app.getHttpServer()).get('/captcha/providers/list').expect(200);
  });

  it('protected route without credentials returns the filter envelope', async () => {
    app = await createE2eApp();
    const res = await request(app.getHttpServer()).get('/captcha/x/y').expect(401);
    expect(res.body).toEqual({
      data: {
        result: { statusCode: 401, timestamp: expect.any(String), path: '/captcha/x/y' },
        message: expect.stringMatching(/^UnauthorizedException/),
      },
    });
    expect(new Date(res.body.data.result.timestamp).toISOString()).toBe(res.body.data.result.timestamp);
  });

  it('wrong password is 401, correct credentials are accepted', async () => {
    app = await createE2eApp();
    await request(app.getHttpServer()).get('/captcha/x/y').auth(TEST_AUTH_USERNAME, 'wrong-password-123').expect(401);
    const res = await request(app.getHttpServer()).get('/captcha/x/y').auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD);
    expect(res.status).not.toBe(401);
  });

  describe('auth token rules at configuration load', () => {
    const originalEnv = process.env.NODE_ENV;
    let restore: () => void;

    const configure = (tokens: unknown[], nodeEnv?: string) => {
      restore = setConfig({ auth: { basicAuthTokens: tokens } });
      if (nodeEnv) process.env.NODE_ENV = nodeEnv;
      return Test.createTestingModule({ imports: [AppModule] }).compile();
    };

    afterEach(() => {
      restore?.();
      if (originalEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalEnv;
    });

    it('refuses the publicly known default credential', async () => {
      await expect(configure(['username:password'])).rejects.toThrow(/publicly known default credential/);
    });

    it.each([
      [[], /is empty/],
      [['<changeme>'], /placeholder/],
      [['nocolon'], /must have the form/],
      [['u:short'], /shorter than 8/],
    ])('production rejects %j', async (tokens, pattern) => {
      await expect(configure(tokens as unknown[], 'production')).rejects.toThrow(pattern);
    });
  });
});
