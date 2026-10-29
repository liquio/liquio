import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2eApp, setConfig, TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from './helpers/create-app';

describe('Captcha (e2e)', () => {
  let app: INestApplication | undefined;
  let restore: (() => void) | undefined;

  const start = async (captcha: unknown) => {
    restore = setConfig({ captcha });
    app = await createE2eApp();
  };
  const get = (path: string) => request(app!.getHttpServer()).get(path).auth(TEST_AUTH_USERNAME, TEST_AUTH_PASSWORD);

  afterEach(async () => {
    await app?.close();
    app = undefined;
    restore?.();
    restore = undefined;
  });

  describe('enabled', () => {
    beforeEach(() => start({ isEnabled: true, hmacKey: 'e2e-hmac-key-not-secret', isEnabledFor: ['svc.*', 'other.allowed'] }));

    it('lists providers', async () => {
      const res = await request(app!.getHttpServer()).get('/captcha/providers/list').expect(200);
      expect(res.body).toEqual({ data: { isEnabledFor: ['svc.*', 'other.allowed'] } });
    });

    it.each(['/captcha/svc/anything', '/captcha/other/allowed'])('returns a challenge for %s', async (path) => {
      const res = await get(path).expect(200);
      expect(res.body.data.challenge).toEqual(
        expect.objectContaining({
          algorithm: expect.any(String),
          challenge: expect.any(String),
          salt: expect.any(String),
          signature: expect.any(String),
        }),
      );
    });

    it('returns a null payload for a method that is not enabled', async () => {
      const res = await get('/captcha/other/denied').expect(200);
      expect(res.body.data ?? null).toBeNull();
    });
  });

  it('disabled captcha lists nothing and returns no challenge', async () => {
    await start({ isEnabled: false });
    const list = await request(app!.getHttpServer()).get('/captcha/providers/list').expect(200);
    expect(list.body).toEqual({ data: { isEnabledFor: [] } });
    const res = await get('/captcha/svc/anything').expect(200);
    expect(res.body.data ?? null).toBeNull();
  });

  it('missing hmacKey is a 500', async () => {
    await start({ isEnabled: true, isEnabledFor: ['svc.*'] });
    const res = await get('/captcha/svc/anything').expect(500);
    expect(res.body.data.message).toContain('HMAC key is not configured');
  });

  it('invalid isEnabledFor is a 500', async () => {
    await start({ isEnabled: true, hmacKey: 'e2e-hmac-key-not-secret', isEnabledFor: 'svc.*' });
    const res = await request(app!.getHttpServer()).get('/captcha/providers/list').expect(500);
    expect(res.body.data.message).toContain('Invalid captcha configuration');
  });
});
