import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { isBasicAuthTokenAllowed } from '@modules/auth/auth-tokens';

// Constants.
const PDF_ROUTE = /^\/pdf\/?$/i;
const BASIC_PREFIX = 'basic ';

export const DEFAULT_BODY_LIMIT = '100kb';
export const DEFAULT_PDF_BODY_LIMIT = '50mb';

export type BodyParserOptions = {
  /** Limit for every route except `POST /pdf`. */
  defaultLimit?: string;
  /** Limit for `POST /pdf`; applied only to requests that already carry an allowed Basic token. */
  pdfLimit?: string;
  /** Allowed `Basic <base64(user:password)>` tokens. */
  basicAuthTokens: string[];
};

/**
 * Creates the body parsing middleware. Must replace Nest's default parser (`bodyParser: false`).
 * Large bodies are buffered only for authenticated `POST /pdf` calls, everything else gets a small limit.
 * @param {BodyParserOptions} options - Limits and allowed tokens.
 */
export function createBodyParserMiddleware(options: BodyParserOptions) {
  const defaultParser = json({ limit: options.defaultLimit || DEFAULT_BODY_LIMIT });
  const pdfParser = json({ limit: options.pdfLimit || DEFAULT_PDF_BODY_LIMIT });

  return (req: Request, res: Response, next: NextFunction) => {
    // Answer parser errors (413, malformed JSON) directly: errors raised in `app.use` middleware would otherwise become 500.
    const onParsed: NextFunction = (error?: unknown) => {
      const status = (error as { status?: number } | undefined)?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        res.status(status).json({ statusCode: status, message: (error as Error).message });
        return;
      }
      next(error);
    };

    if (req.method !== 'POST' || !PDF_ROUTE.test(req.path)) {
      return defaultParser(req, res, onParsed);
    }

    if (!hasAllowedToken(req, options.basicAuthTokens)) {
      // Do not read the body. The guard would reject it anyway, this just avoids buffering it first.
      res.status(401).set('WWW-Authenticate', 'Basic').json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    return pdfParser(req, res, onParsed);
  };
}

function hasAllowedToken(req: Request, allowedTokens: string[]): boolean {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || header.slice(0, BASIC_PREFIX.length).toLowerCase() !== BASIC_PREFIX) {
    return false;
  }

  // Normalise like the passport strategy does (decode, then re-encode) so equivalent encodings match.
  const credentials = Buffer.from(header.slice(BASIC_PREFIX.length).trim(), 'base64').toString();
  if (!credentials.includes(':')) {
    return false;
  }

  return isBasicAuthTokenAllowed(`Basic ${Buffer.from(credentials).toString('base64')}`, allowedTokens);
}
