/**
 * Security Middleware for XSS Prevention
 *
 * Implements:
 * - Content Security Policy (CSP) headers
 * - X-Frame-Options for clickjacking protection
 * - X-Content-Type-Options to prevent MIME sniffing
 * - Strict-Transport-Security for HTTPS
 * - X-XSS-Protection legacy header
 */

import cors from 'cors';

/**
 * CSP Middleware Factory
 * Configurable Content Security Policy headers
 */
export function cspMiddleware(options: { directives?: Record<string, string[]> } = {}): (req: any, res: any, next: any) => void {
  const defaults = {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''], // Note: unsafe-inline should be removed in production
      imgSrc: ['\'self\'', 'data:', 'https:'],
      fontSrc: ['\'self\''],
      connectSrc: ['\'self\''],
      frameSrc: ['\'none\''],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      childSrc: ['\'none\''],
    },
    ...options,
  };

  return (req: any, res: any, next: any) => {
    const cspHeader = Object.entries(defaults.directives)
      .map(([key, values]) => {
        const directiveName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${directiveName} ${Array.isArray(values) ? values.join(' ') : values}`;
      })
      .join('; ');

    res.setHeader('Content-Security-Policy', cspHeader);
    res.setHeader('Content-Security-Policy-Report-Only', cspHeader);

    next();
  };
}

/**
 * Security Headers Middleware
 * Sets standard security headers to prevent common attacks
 */
export function securityHeadersMiddleware(options: { frameOptions?: string } = {}): (req: any, res: any, next: any) => void {
  return (req: any, res: any, next: any) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', options.frameOptions || 'DENY');

    // Legacy XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()',
    );

    // HSTS (only enable in production)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    next();
  };
}

/**
 * Input Sanitization Middleware
 * Prevents common XSS vectors in request bodies and query parameters
 */
export function inputSanitizationMiddleware(_options: Record<string, unknown> = {}): (req: any, res: any, next: any) => void {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi, // <script> tags
    /javascript:/gi, // javascript: protocol
    /on\w+\s*=/gi, // Event handlers (onclick, onload, etc)
    /<iframe[^>]*>.*?<\/iframe>/gi, // <iframe> tags
    /<object[^>]*>.*?<\/object>/gi, // <object> tags
    /<embed[^>]*>/gi, // <embed> tags
  ];

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;
    dangerousPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  };

  const sanitizeObject = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }

    return sanitizeValue(obj);
  };

  return (req: any, res: any, next: any) => {
    // Sanitize query parameters. Express 5's req.query is a getter with no setter (recomputed
    // from the URL on every access, uncached), so a plain `req.query = ...` assignment either
    // throws (strict mode) or is silently dropped - redefine the property instead.
    if (req.query) {
      Object.defineProperty(req, 'query', {
        value: sanitizeObject(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize URL params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
}

/**
 * CORS Origin Validation Middleware
 * Strict whitelist-based CORS configuration using cors package
 */
export function corsValidationMiddleware(options: { allowedOrigins?: string[] } = {}): any {
  const allowedOrigins = options.allowedOrigins || ['*'];

  return cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
}

/**
 * Response Encoding Middleware
 *
 * Also carries this service's restify -> express response-compatibility shim: every controller
 * still calls `res.send([statusCode], body)` the way restify's res.send worked (and restify's
 * JSON formatter special-cased Error bodies, overriding the status code with
 * `body.statusCode || 500` and the body with `body.body || {message: body.message}`). Express's
 * res.send only takes a single body argument, so this override restores the old calling
 * convention at every one of those call sites rather than rewriting them all.
 */
export function responseEncodingMiddleware(_options: Record<string, unknown> = {}): (req: any, res: any, next: any) => void {
  return (req: any, res: any, next: any) => {
    // Override res.send to ensure proper content-type, encoding, and the restify calling convention.
    const originalSend = res.send.bind(res);

    res.send = function (arg1?: any, arg2?: any) {
      let statusCode: number | undefined;
      let body: any = arg1;
      if (typeof arg1 === 'number') {
        statusCode = arg1;
        body = arg2;
      }

      if (body instanceof Error) {
        statusCode = (body as any).statusCode || statusCode || 500;
        body = (body as any).body || { message: body.message };
      }

      if (statusCode !== undefined) {
        res.status(statusCode);
      }

      // Set proper content type if not already set
      if (!res.getHeader('Content-Type')) {
        if (typeof body === 'object') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else if (typeof body === 'string') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
      }

      return body === undefined ? originalSend() : originalSend(body);
    };

    next();
  };
}
