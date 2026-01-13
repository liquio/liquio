const {
  cspMiddleware,
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  corsValidationMiddleware,
  responseEncodingMiddleware,
} = require('../middleware/security');

describe('Security Middleware - XSS Prevention', () => {
  describe('cspMiddleware', () => {
    it('should set Content-Security-Policy header', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = cspMiddleware();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining('default-src')
      );
      expect(next).toHaveBeenCalled();
    });

    it('should include script-src directive', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = cspMiddleware();
      middleware(req, res, next);

      const calls = res.setHeader.mock.calls;
      const cspCall = calls.find(c => c[0] === 'Content-Security-Policy');
      expect(cspCall[1]).toContain('script-src \'self\'');
    });

    it('should allow custom directives', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const customDirectives = {
        scriptSrc: ['\'self\'', 'https://trusted.com'],
      };
      const middleware = cspMiddleware({ directives: customDirectives });
      middleware(req, res, next);

      const calls = res.setHeader.mock.calls;
      const cspCall = calls.find(c => c[0] === 'Content-Security-Policy');
      expect(cspCall[1]).toContain('https://trusted.com');
    });
  });

  describe('securityHeadersMiddleware', () => {
    it('should set X-Content-Type-Options', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = securityHeadersMiddleware();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options to DENY by default', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = securityHeadersMiddleware();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection header', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = securityHeadersMiddleware();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set Referrer-Policy header', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = securityHeadersMiddleware();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should set Permissions-Policy header', () => {
      const req = {};
      const res = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      const middleware = securityHeadersMiddleware();
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=()'
      );
    });
  });

  describe('inputSanitizationMiddleware', () => {
    it('should remove <script> tags from query parameters', () => {
      const req = {
        query: { name: '<script>alert("xss")</script>test' },
        body: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      const middleware = inputSanitizationMiddleware();
      middleware(req, res, next);

      expect(req.query.name).not.toContain('<script>');
      expect(req.query.name).toContain('test');
    });

    it('should remove javascript: protocol from inputs', () => {
      const req = {
        query: { url: 'javascript:alert("xss")' },
        body: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      const middleware = inputSanitizationMiddleware();
      middleware(req, res, next);

      expect(req.query.url).not.toContain('javascript:');
    });

    it('should remove event handler attributes', () => {
      const req = {
        query: {},
        body: { html: '<img src=x onclick="alert(1)">' },
        params: {},
      };
      const res = {};
      const next = jest.fn();

      const middleware = inputSanitizationMiddleware();
      middleware(req, res, next);

      expect(req.body.html).not.toContain('onclick=');
    });

    it('should remove null bytes', () => {
      const req = {
        query: { data: 'test\0value' },
        body: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      const middleware = inputSanitizationMiddleware();
      middleware(req, res, next);

      expect(req.query.data).not.toContain('\0');
    });

    it('should sanitize nested objects', () => {
      const req = {
        query: {},
        body: {
          user: {
            name: '<script>bad</script>',
            email: 'test@example.com',
            profile: {
              bio: 'javascript:attack()',
            },
          },
        },
        params: {},
      };
      const res = {};
      const next = jest.fn();

      const middleware = inputSanitizationMiddleware();
      middleware(req, res, next);

      expect(req.body.user.name).not.toContain('<script>');
      expect(req.body.user.profile.bio).not.toContain('javascript:');
    });

    it('should handle arrays in input', () => {
      const req = {
        query: {},
        body: {
          items: ['<script>test</script>', 'safe'],
        },
        params: {},
      };
      const res = {};
      const next = jest.fn();

      const middleware = inputSanitizationMiddleware();
      middleware(req, res, next);

      expect(req.body.items[0]).not.toContain('<script>');
      expect(req.body.items[1]).toBe('safe');
    });
  });

  describe('corsValidationMiddleware', () => {
    it('should allow requests from whitelisted origins', () => {
      const req = {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      };
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      const middleware = corsValidationMiddleware({
        allowedOrigins: ['http://localhost:3000'],
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
      expect(next).toHaveBeenCalled();
    });

    it('should not set CORS headers for non-whitelisted origins', () => {
      const req = {
        method: 'GET',
        headers: { origin: 'http://evil.com' },
      };
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      const middleware = corsValidationMiddleware({
        allowedOrigins: ['http://localhost:3000'],
      });
      middleware(req, res, next);

      const setCalls = res.setHeader.mock.calls;
      const corsCall = setCalls.find(c => c[0] === 'Access-Control-Allow-Origin');
      expect(corsCall).toBeUndefined();
    });

    it('should handle OPTIONS preflight requests', () => {
      const req = {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      };
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      const middleware = corsValidationMiddleware({
        allowedOrigins: ['http://localhost:3000'],
      });
      middleware(req, res, next);

      expect(res.send).toHaveBeenCalledWith(204);
      expect(next).not.toHaveBeenCalled();
    });

    it('should set proper CORS headers', () => {
      const req = {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      };
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      const middleware = corsValidationMiddleware({
        allowedOrigins: ['http://localhost:3000'],
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, PATCH'
      );
    });
  });

  describe('responseEncodingMiddleware', () => {
    it('should override res.send to set proper headers', () => {
      const req = {};
      const res = {
        getHeader: jest.fn(() => null),
        setHeader: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      const middleware = responseEncodingMiddleware();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(typeof res.send).toBe('function');
    });

    it('should set JSON content-type for object responses', () => {
      const req = {};
      const sendMock = jest.fn();
      const res = {
        getHeader: jest.fn(() => null),
        setHeader: jest.fn(),
        send: sendMock,
      };
      const next = jest.fn();

      const middleware = responseEncodingMiddleware();
      middleware(req, res, next);

      // Simulate calling res.send with an object
      res.send(200, { data: 'test' });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8'
      );
    });

    it('should respect already-set Content-Type header', () => {
      const req = {};
      const sendMock = jest.fn();
      const res = {
        getHeader: jest.fn(() => 'application/custom'),
        setHeader: jest.fn(),
        send: sendMock,
      };
      const next = jest.fn();

      const middleware = responseEncodingMiddleware();
      middleware(req, res, next);

      res.send(200, 'test');

      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should chain multiple security middlewares', () => {
      const req = {
        query: { search: '<script>alert(1)</script>' },
        body: { input: 'javascript:void(0)' },
        params: {},
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      };
      const res = {
        setHeader: jest.fn(),
        getHeader: jest.fn(() => null),
        send: jest.fn(),
      };

      // Run multiple middlewares in sequence
      const middlewares = [
        securityHeadersMiddleware(),
        inputSanitizationMiddleware(),
        corsValidationMiddleware({ allowedOrigins: ['http://localhost:3000'] }),
        responseEncodingMiddleware(),
      ];

      const next = jest.fn();
      middlewares.forEach(mw => mw(req, res, next));

      // Verify sanitization worked
      expect(req.query.search).not.toContain('<script>');
      expect(req.body.input).not.toContain('javascript:');

      // Verify security headers set
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });
  });
});
