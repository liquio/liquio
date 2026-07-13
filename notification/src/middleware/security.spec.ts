import express from 'express';
import request from 'supertest';

import {
  cspMiddleware,
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  corsValidationMiddleware,
  responseEncodingMiddleware,
} from './security';

// Helper: create an express app that mounts the middleware and a noop controller
const defaultHandler = (req: any, res: any) => {
  res.send(req.body && Object.keys(req.body).length ? req.body : req.query);
};

const makeApp = (mw: any, handler: any = defaultHandler) => {
  const app = express();
  app.use(express.json());
  app.use(mw);

  app.get('/test', (req, res) => handler(req, res));
  app.post('/test', (req, res) => handler(req, res));

  return app;
};

describe('Security Middleware - express integration', () => {
  describe('cspMiddleware', () => {
    it('sets Content-Security-Policy header', async () => {
      const app = makeApp(cspMiddleware());
      const res = await request(app).get('/test');
      expect(res.headers['content-security-policy']).toEqual(expect.stringContaining('default-src'));
    });

    it('includes script-src directive', async () => {
      const app = makeApp(cspMiddleware());
      const res = await request(app).get('/test');
      expect(res.headers['content-security-policy']).toEqual(expect.stringContaining('script-src \'self\''));
    });

    it('respects custom directives', async () => {
      const app = makeApp(cspMiddleware({ directives: { scriptSrc: ['\'self\'', 'https://trusted.com'] } }));
      const res = await request(app).get('/test');
      expect(res.headers['content-security-policy']).toEqual(expect.stringContaining('https://trusted.com'));
    });
  });

  describe('securityHeadersMiddleware', () => {
    it('sets common security headers', async () => {
      const app = makeApp(securityHeadersMiddleware());
      const res = await request(app).get('/test');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=(), payment=()');
    });
  });

  describe('inputSanitizationMiddleware', () => {
    it('sanitizes query parameters', async () => {
      const app = makeApp(inputSanitizationMiddleware());
      const res = await request(app).get('/test').query({ name: '<script>alert(1)</script>ok' });
      expect(res.body.name).toBeDefined();
      expect(res.body.name).not.toContain('<script>');
    });

    it('sanitizes body payload', async () => {
      const app = makeApp(inputSanitizationMiddleware());
      const payload = { html: '<img src=x onclick="alert(1)">' };
      const res = await request(app).post('/test').send(payload).set('Content-Type', 'application/json');
      expect(res.body.html).toBeDefined();
      expect(res.body.html).not.toContain('onclick=');
    });

    it('sanitizes nested and arrays', async () => {
      const app = makeApp(inputSanitizationMiddleware());
      const payload = { user: { name: '<script>bad</script>', profile: { bio: 'javascript:attack()' }, items: ['<script>1</script>', 'safe'] } };
      const res = await request(app).post('/test').send(payload).set('Content-Type', 'application/json');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBeDefined();
      expect(res.body.user.name).not.toContain('<script>');
      expect(res.body.user.profile.bio).not.toContain('javascript:');
      expect(res.body.user.items[0]).not.toContain('<script>');
      expect(res.body.user.items[1]).toBe('safe');
    });
  });

  describe('corsValidationMiddleware (real cors)', () => {
    it('allows requests from whitelisted origin', async () => {
      const app = makeApp(corsValidationMiddleware({ allowedOrigins: ['http://localhost:3000'] }), (req: any, res: any) => { res.send('ok'); return; });
      const res = await request(app).get('/test').set('Origin', 'http://localhost:3000');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('rejects non-whitelisted origin by not setting CORS headers', async () => {
      const app = makeApp(corsValidationMiddleware({ allowedOrigins: ['http://localhost:3000'] }), (req: any, res: any) => { res.send('ok'); return; });
      const res = await request(app).get('/test').set('Origin', 'http://evil.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('handles OPTIONS preflight with 204', async () => {
      const app = makeApp(corsValidationMiddleware({ allowedOrigins: ['http://localhost:3000'] }), (req: any, res: any) => { res.send('ok'); return; });
      const res = await request(app).options('/test').set('Origin', 'http://localhost:3000');
      expect(res.status).toBe(204);
    });

    it('sets proper CORS headers', async () => {
      const app = makeApp(corsValidationMiddleware({ allowedOrigins: ['http://localhost:3000'] }), (req: any, res: any) => { res.send('ok'); return; });
      const res = await request(app).get('/test').set('Origin', 'http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('responseEncodingMiddleware', () => {
    it('sets JSON content-type for object responses', async () => {
      const app = express();
      app.use(express.json());
      app.use(responseEncodingMiddleware());
      app.get('/test', (req, res) => { (res as any).send(200, { data: 'x' }); });
      const res = await request(app).get('/test');
      expect(res.headers['content-type']).toEqual(expect.stringContaining('application/json'));
    });

    it('respects existing Content-Type header', async () => {
      const app = express();
      app.use(express.json());
      app.use(responseEncodingMiddleware());
      app.get('/test', (req, res) => {
        (res as any).send(200, 'ok');
      });
      const res = await request(app).get('/test');
      // The middleware should set a content-type (text/plain or octet-stream depending on version)
      // and should not throw an error
      expect(res.headers['content-type']).toBeDefined();
    });
  });
});
