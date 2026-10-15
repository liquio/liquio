import type { Response as SupertestResponse } from 'supertest';

import { TestApp, TEST_AUTH_HEADER, TEST_SERVICE } from './test-app';

describe('Message Controller', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  describe('POST /message/test/sms', () => {
    it('rejects requests without the test service token', async () => {
      await app.request().post('/message/test/sms').query({ phone: TEST_SERVICE.phones[0] }).expect(401);
    });

    it('sends through the real (canned) SMS adapter for a whitelisted test phone', async () => {
      await app
        .request()
        .post('/message/test/sms')
        .set('Authorization', TEST_SERVICE.token)
        .query({ phone: TEST_SERVICE.phones[0] })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body.error).toBeUndefined();
        });
    });

    it('reports an error for a phone not whitelisted in testService.phones', async () => {
      await app
        .request()
        .post('/message/test/sms')
        .set('Authorization', TEST_SERVICE.token)
        .query({ phone: '+380000000000' })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.error).toHaveProperty('message', 'Used phone not defined as test in config.');
        });
    });
  });

  describe('POST /message/test/email', () => {
    it('reports the SMTP-disabled result for a whitelisted test email', async () => {
      await app
        .request()
        .post('/message/test/email')
        .set('Authorization', TEST_SERVICE.token)
        .query({ email: TEST_SERVICE.emails[0] })
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body.data).toEqual({ skipped: true, reason: 'SMTP is disabled in config.' });
        });
    });
  });

  describe('GET /message', () => {
    it('rejects requests without Basic auth', async () => {
      await app.request().get('/message').expect(401);
    });

    it('round-trips through the real database and returns an empty list on a fresh schema', async () => {
      await app
        .request()
        .get('/message')
        .set('Authorization', TEST_AUTH_HEADER)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(Array.isArray(response.body.result)).toBe(true);
          expect(response.body.result).toHaveLength(0);
        });
    });
  });

  describe('user-scoped routes (NT-02)', () => {
    const routes: [string, string, string][] = [
      ['PUT', '/message/is_read', 'messages=1&user_id=1'],
      ['GET', '/message/unread', 'user_id=1'],
      ['GET', '/message/1', 'user_id=1'],
    ];

    it.each(routes)('%s %s rejects user_id access without Basic auth', async (method, path, query) => {
      const req = method === 'PUT' ? app.request().put(`${path}?${query}`) : app.request().get(`${path}?${query}`);
      await req.expect(401);
    });

    it('GET /message/unread returns a count with Basic auth and user_id', async () => {
      await app
        .request()
        .get('/message/unread')
        .query({ user_id: 1 })
        .set('Authorization', TEST_AUTH_HEADER)
        .expect(200)
        .expect((response: SupertestResponse) => {
          expect(response.body).toEqual({ total: 0 });
        });
    });

    it('GET /message/unread answers 400 when neither access_token nor user_id is given', async () => {
      await app.request().get('/message/unread').set('Authorization', TEST_AUTH_HEADER).expect(400);
    });

    it('GET /message/:id answers 404 for a message the user does not have', async () => {
      await app.request().get('/message/1').query({ user_id: 1 }).set('Authorization', TEST_AUTH_HEADER).expect(404);
    });
  });
});
