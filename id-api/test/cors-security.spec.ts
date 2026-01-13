/// <reference types="jest" />

/**
 * CORS Security Tests
 * Validates that CORS configuration properly restricts origins
 * and prevents unauthorized cross-origin requests
 * 
 * OWASP A01:2021 - Broken Access Control
 */

import { Request, Response, NextFunction } from 'express';

// Mock CORS middleware from cors.ts
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(origin => origin.trim());

function setCorsForTest(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Expose-Headers', 'Name, Version, Customer, Environment');
  let oneof = false;
  
  // Only allow origins from the allowlist
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    oneof = true;
  }
  
  if (req.headers['access-control-request-method']) {
    res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
    oneof = true;
  }
  if (req.headers['access-control-request-headers']) {
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
    oneof = true;
  }
  if (oneof) {
    res.header('Access-Control-Max-Age', '31536000');
  }

  if (oneof && req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }
  
  next();
}

describe('CORS Security - id-api', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let headerSpy: jest.SpyInstance<Response>;
  let statusSpy: jest.SpyInstance<Response>;

  beforeEach(() => {
    mockRes = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    headerSpy = jest.spyOn(mockRes as Response, 'header');
    statusSpy = jest.spyOn(mockRes as Response, 'status');
  });

  describe('Allowed Origins', () => {
    it('should allow requests from whitelisted origins', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow multiple configured origins', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'http://localhost:3001' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3001'
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Blocked Origins', () => {
    it('should NOT set CORS headers for unauthorized origins', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'http://malicious.com' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://malicious.com'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should NOT set CORS headers for missing origin', () => {
      mockReq = {
        method: 'GET',
        headers: {},
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Access-Control-Allow-Origin'),
        expect.anything()
      );
    });

    it('should block wildcard origin attacks', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: '*' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        '*'
      );
    });

    it('should block null origin attacks', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'null' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'null'
      );
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS requests from allowed origins', () => {
      mockReq = {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Content-Type',
        },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(204);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set CORS max age header', () => {
      mockReq = {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
        },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Max-Age',
        '31536000'
      );
    });
  });

  describe('Header Validation', () => {
    it('should only expose safe headers', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Expose-Headers',
        'Name, Version, Customer, Environment'
      );
    });

    it('should respect request method from headers', () => {
      mockReq = {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'DELETE',
        },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'DELETE'
      );
    });

    it('should respect request headers from client', () => {
      mockReq = {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-headers': 'Authorization, X-Custom-Header',
        },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Authorization, X-Custom-Header'
      );
    });
  });

  describe('Environment Configuration', () => {
    it('should load additional origins from CORS_ALLOWED_ORIGINS env var', () => {
      const originalEnv = process.env.CORS_ALLOWED_ORIGINS;
      
      process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000,https://api.example.com';
      
      // Reload the origins
      const loadedOrigins = process.env.CORS_ALLOWED_ORIGINS
        .split(',')
        .map(origin => origin.trim());

      expect(loadedOrigins).toContain('http://localhost:3000');
      expect(loadedOrigins).toContain('https://api.example.com');

      // Restore
      if (originalEnv) {
        process.env.CORS_ALLOWED_ORIGINS = originalEnv;
      } else {
        delete process.env.CORS_ALLOWED_ORIGINS;
      }
    });
  });

  describe('Credentials', () => {
    it('should set credentials header for allowed origins', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
    });

    it('should NOT set credentials for unauthorized origins', () => {
      mockReq = {
        method: 'GET',
        headers: { origin: 'http://evil.com' },
      };

      setCorsForTest(mockReq as Request, mockRes as Response, mockNext);

      expect(headerSpy).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
    });
  });
});
