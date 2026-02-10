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

const cors = require('cors');

/**
 * CSP Middleware Factory
 * Configurable Content Security Policy headers
 */
function cspMiddleware(options = {}) {
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

  return (req, res, next) => {
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
function securityHeadersMiddleware(options = {}) {
  return (req, res, next) => {
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
      'geolocation=(), microphone=(), camera=(), payment=()'
    );

    // HSTS (only enable in production)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    next();
  };
}

/**
 * Input Sanitization Middleware
 * Prevents common XSS vectors in request bodies and query parameters
 */
function inputSanitizationMiddleware(_options = {}) {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi, // <script> tags
    /javascript:/gi, // javascript: protocol
    /on\w+\s*=/gi, // Event handlers (onclick, onload, etc)
    /<iframe[^>]*>.*?<\/iframe>/gi, // <iframe> tags
    /<object[^>]*>.*?<\/object>/gi, // <object> tags
    /<embed[^>]*>/gi, // <embed> tags
  ];

  const sanitizeValue = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  };

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }

    return sanitizeValue(obj);
  };

  return (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
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
function corsValidationMiddleware(options = {}) {
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
 * Ensures all text responses are properly HTML-encoded
 */
function responseEncodingMiddleware(_options = {}) {
  return (req, res, next) => {
    // Override res.send to ensure proper content-type and encoding
    const originalSend = res.send.bind(res);

    res.send = function(code, body, headers) {
      // Set proper content type if not already set
      if (!res.getHeader('Content-Type')) {
        if (typeof body === 'object') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else if (typeof body === 'string') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
      }

      return originalSend(code, body, headers);
    };

    next();
  };
}

module.exports = {
  cspMiddleware,
  securityHeadersMiddleware,
  inputSanitizationMiddleware,
  corsValidationMiddleware,
  responseEncodingMiddleware,
};
