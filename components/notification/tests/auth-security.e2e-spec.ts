import crypto from 'node:crypto';

import { getConf } from '../src/lib/context';
import { TestApp, TEST_AUTH_HEADER } from './test-app';

const md5 = (data: string) => crypto.createHash('md5').update(data).digest('hex');

describe('Auth and security middleware', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  describe('Basic auth (checkAuth)', () => {
    const basic = (value: string) => `Basic ${Buffer.from(value).toString('base64')}`;
    const get = (authorization?: string) => {
      const req = app.request().get('/transport');
      return authorization === undefined ? req : req.set('Authorization', authorization);
    };

    it.each([
      ['no header', undefined, 'Authorization empty'],
      ['blank header', ' ', 'Authorization empty'],
      ['Bearer scheme', 'Bearer abc', 'Authorization empty'],
      ['Basic without data', 'Basic', 'Authorization empty'],
      ['no colon separator', basic('nocolon'), 'Authorization token not valid'],
      ['empty password', basic('e2e:'), 'Password not match'],
      ['wrong password', basic('e2e:wrong'), 'User not match'],
      ['wrong login', basic('other:e2e-pass'), 'User not match'],
    ])('rejects %s with 401', async (_name, header, message) => {
      const res = await get(header).expect(401);
      expect(res.body).toEqual({ code: 'Authorization error', message });
    });

    it('accepts configured credentials', async () => {
      await get(TEST_AUTH_HEADER).expect(200);
    });

    it('falls back to the hashed Authorize table when no list is configured', async () => {
      const { AuthorizeModel } = require('../src/models/authorize');
      const Authorize = new AuthorizeModel().Authorize;
      const login = 'db-client';
      const password = 'db-client-pass';
      const hmacLogin = crypto.createHmac('sha512', login).update(password).digest('hex').toUpperCase();
      await Authorize.create({ login: hmacLogin, password });

      const saved = getConf().authorization;
      getConf().authorization = {};
      try {
        await get(basic(`${login}:${password}`)).expect(200);
        await get(basic(`${login}:wrong`)).expect(401);
      } finally {
        getConf().authorization = saved;
      }
    });
  });

  describe('Test auth (checkTestAuth)', () => {
    it('rejects when the token is not configured', async () => {
      const saved = getConf().testService;
      getConf().testService = undefined;
      try {
        const res = await app.request().post('/message/test/sms').set('Authorization', 'anything').expect(401);
        expect(res.body.message).toBe('Test auth token not defined in config.');
      } finally {
        getConf().testService = saved;
      }
    });
  });

  describe('Digest auth on /configs (checkConfigAuth)', () => {
    const login = 'digest-client';
    const password = 'digest-client-pass';

    beforeAll(async () => {
      const { AuthorizeModel } = require('../src/models/authorize');
      await new AuthorizeModel().Authorize.create({ login, password });
    });

    const challenge = async (method: string, uri: string) => {
      const res = await (app.request() as any)[method.toLowerCase()](uri);
      expect(res.status).toBe(401);
      const header: string = res.headers['www-authenticate'];
      return { nonce: /nonce="([^"]+)"/.exec(header)![1], header };
    };

    const digest = (method: string, uri: string, nonce: string, opts: { nc?: string; password?: string; uri?: string; username?: string } = {}) => {
      const nc = opts.nc || '00000001';
      const cnonce = 'abcdef';
      const username = opts.username || login;
      const ha1 = md5(`${username}:Digest Authenticatoin:${opts.password || password}`);
      const ha2 = md5(`${method}:${uri}`);
      const response = md5([ha1, nonce, nc, cnonce, 'auth', ha2].join(':'));
      return `Digest username="${username}", nonce="${nonce}", nc=${nc}, cnonce="${cnonce}", qop=auth, uri="${opts.uri || uri}", response="${response}"`;
    };

    it('answers with a challenge when no Digest credentials are given', async () => {
      const { header } = await challenge('GET', '/configs');
      expect(header).toMatch(/^Digest realm=/);
    });

    it('rejects incomplete Digest parameters', async () => {
      const res = await app.request().get('/configs').set('Authorization', 'Digest username="x"').expect(401);
      expect(res.body.message).toBe('Not valid authorization params');
    });

    it('rejects an invalid nonce', async () => {
      const res = await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', 'bad.nonce.value'))
        .expect(401);
      expect(res.body.message).toBe('Nonce not valid or expired');
    });

    it('rejects a signed uri that differs from the requested one', async () => {
      const { nonce } = await challenge('GET', '/configs');
      const res = await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/other', nonce))
        .expect(401);
      expect(res.body.message).toBe('Not valid uri');
    });

    it('rejects an unknown login and a wrong password', async () => {
      const { nonce } = await challenge('GET', '/configs');
      const unknown = await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', nonce, { username: 'nobody' }))
        .expect(401);
      expect(unknown.body.message).toBe('Not valid login');
      const wrong = await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', nonce, { password: 'wrong' }))
        .expect(401);
      expect(wrong.body.message).toBe('Not valid password');
    });

    it('accepts valid credentials once per nonce counter and rejects a replay', async () => {
      const { nonce } = await challenge('GET', '/configs');
      await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', nonce))
        .expect(200);
      const replay = await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', nonce))
        .expect(401);
      expect(replay.body.message).toBe('Nonce count not valid');
      await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', nonce, { nc: '00000002' }))
        .expect(200);
      const badNc = await app
        .request()
        .get('/configs')
        .set('Authorization', digest('GET', '/configs', nonce, { nc: 'zz' }))
        .expect(401);
      expect(badNc.body.message).toBe('Nonce count not valid');
    });

    it('manages configs: create, list, update, delete', async () => {
      const call = async (method: string, uri: string, body?: any) => {
        const { nonce } = await challenge(method, uri);
        const req = (app.request() as any)[method.toLowerCase()](uri).set('Authorization', digest(method, uri, nonce));
        return body === undefined ? req : req.send(body);
      };

      const created = await call('POST', '/configs', { environment: 'e2e', info: { a: 1 } });
      expect(created.status).toBe(200);
      const id = created.body.id;

      const list = await call('GET', '/configs?environment=e2e');
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect((await call('GET', '/configs')).body.length).toBeGreaterThan(0);

      const updated = await call('PUT', `/configs/${id}`, { info: { a: 2 } });
      expect(updated.status).toBe(200);
      expect(updated.body.info).toEqual({ a: 2 });
      expect((await call('PUT', '/configs/999999', { info: {} })).status).toBe(400);

      expect((await call('POST', '/configs', { info: {} })).status).toBe(500);
      expect((await call('PUT', `/configs/${id}`, { environment: null })).status).toBe(500);

      expect((await call('DELETE', `/configs/${id}`)).status).toBe(200);
      expect((await call('GET', '/configs?environment=e2e')).body).toEqual([]);
    });
  });

  describe('Security headers, CORS and sanitization', () => {
    it('sets hardening headers on every response', async () => {
      const res = await app.request().get('/test/ping').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toContain('geolocation=()');
    });

    it('sends HSTS in production', async () => {
      const saved = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await app.request().get('/test/ping').expect(200);
        expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      } finally {
        process.env.NODE_ENV = saved;
      }
    });

    it('answers a preflight request from an allowed origin', async () => {
      const res = await app
        .request()
        .options('/message')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('strips dangerous markup from query values before the controller sees them', async () => {
      const created = await app
        .request()
        .post('/template')
        .set('Authorization', TEST_AUTH_HEADER)
        .send({ type: 'sms', text: 'sanitize me', title: 'Sanitize' })
        .expect(200);
      const id = created.body.template_id;
      const res = await app
        .request()
        .get('/template')
        .query({ template_id: `<script>alert(1)</script>${id}` })
        .expect(200);
      expect(res.body.template_id).toBe(id);
    });

    it('answers 404 JSON for unknown routes', async () => {
      const res = await app.request().get('/no/such/route').expect(404);
      expect(res.body).toEqual({ code: 'ResourceNotFound', message: '/no/such/route does not exist' });
    });

    it('turns a malformed JSON body into an error response', async () => {
      const res = await app.request().post('/template').set('Authorization', TEST_AUTH_HEADER).set('Content-Type', 'application/json').send('{bad');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });
});
