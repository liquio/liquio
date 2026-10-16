import bodyParser from 'body-parser';
import type { NextFunction, Request, Response } from 'express';

export const DEFAULT_BODY_LIMIT = '10mb';

// Routes that take large JSON payloads (bulk writes, register import). They get the bulk limit, but only after the token check.
const BULK_ROUTES: Array<{ method: string; path: RegExp }> = [
  { method: 'POST', path: /^\/records\/bulk\/?$/i },
  { method: 'POST', path: /^\/records\/bulk-by-person\/?$/i },
  { method: 'DELETE', path: /^\/records\/bulk\/?$/i },
  { method: 'POST', path: /^\/registers\/import\/?$/i },
  { method: 'POST', path: /^\/import\/[^/]+\/?$/i },
];

export type BodyParserOptions = {
  /** Limit for every route outside the bulk group. */
  defaultLimit?: string;
  /** Limit for bulk/import routes, applied only to requests that already carry a configured token. Defaults to `defaultLimit`. */
  bulkLimit?: string;
  /** Allowed `Authorization` / `token` header values (`auth.tokens`). */
  tokens: string[];
};

export const isBulkRoute = (method: string, path: string): boolean =>
  BULK_ROUTES.some((route) => route.method === method.toUpperCase() && route.path.test(path));

const hasAllowedToken = (req: Request, tokens: string[]): boolean => {
  const header = req.headers.authorization || req.headers.token;
  return typeof header === 'string' && Array.isArray(tokens) && tokens.includes(header);
};

/**
 * Creates the JSON body parsing middleware.
 * Large bodies are buffered only for authenticated bulk routes; everything else gets the small default limit.
 * `body-parser` rejects by `Content-Length` before reading the body (413).
 */
export function createBodyParserMiddleware(options: BodyParserOptions) {
  const defaultLimit = options.defaultLimit || DEFAULT_BODY_LIMIT;
  const defaultParser = bodyParser.json({ limit: defaultLimit });
  const bulkParser = bodyParser.json({ limit: options.bulkLimit || defaultLimit });

  return (req: Request, res: Response, next: NextFunction) => {
    // Answer parser errors (413, malformed JSON) directly: otherwise they become a generic 500.
    const onParsed: NextFunction = (error?: unknown) => {
      const status = (error as { status?: number } | undefined)?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        res.status(status).send({ error: { message: (error as Error).message, code: status } });
        return;
      }
      next(error);
    };

    if (!isBulkRoute(req.method, req.path)) {
      return defaultParser(req, res, onParsed);
    }

    if (!hasAllowedToken(req, options.tokens)) {
      // Do not read the body: the route would reject the request anyway.
      res.status(401).send({ error: { message: 'Unknown basic auth token.', code: 401 } });
      return;
    }

    return bulkParser(req, res, onParsed);
  };
}
