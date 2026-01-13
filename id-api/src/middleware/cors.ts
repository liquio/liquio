import { Express, NextFunction, Request, Response } from 'express';

export const ACCESS_CONTROL_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Allowlist of authorized origins - configure via environment variables or hardcoded values
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((origin) => origin.trim());

export function useCors(express: Express) {
  express.use(setCors as any);
}

function setCors(req: Request, res: Response, next: NextFunction): void {
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
    res.header('Access-Control-Max-Age', ACCESS_CONTROL_MAX_AGE.toString());
  }

  // intercept OPTIONS method
  if (oneof && req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
