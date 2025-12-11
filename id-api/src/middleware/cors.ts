import { Express, NextFunction, Request, Response } from 'express';

export const ACCESS_CONTROL_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function useCors(express: Express) {
  express.use(setCors as any);
}

function setCors(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Expose-Headers', 'Name, Version, Customer, Environment');
  let oneof = false;
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
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
