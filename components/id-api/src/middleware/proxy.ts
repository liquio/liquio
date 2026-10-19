import { IncomingMessage } from 'http';

import proxy from 'express-http-proxy';
import { Response, Request } from 'express';
import { Log } from '@liquio/back-core';

import { Express, NextFunction } from '../types';

const ICS_ORIGIN = 'https://ics.gov.ua/';
const DEFAULT_METHODS = ['GET', 'POST'];
const STRIPPED_REQUEST_HEADERS = ['cookie', 'authorization', 'proxy-authorization', 'x-forwarded-for', 'x-real-ip'];

type ProxyGuard = { methods: string[]; paths: string[] };

/**
 * Builds a guard that only lets allow-listed methods and exact paths through to the upstream.
 * Anything else is answered locally, so no upstream call is made.
 */
function guard({ methods, paths }: ProxyGuard) {
  const allowedMethods = methods.map((m) => m.toUpperCase());

  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.includes(req.method.toUpperCase())) {
      return res.status(405).set('Allow', allowedMethods.join(', ')).send('Method not allowed');
    }

    // Inside a mounted router req.path is relative to the mount point and excludes the query string.
    if (!paths.includes(req.path)) {
      return res.status(404).send('Not found');
    }

    next();
  };
}

// Never forward credentials (session cookie, auth headers) or client address chain to the upstream.
function stripCredentials(proxyReqOpts: any) {
  for (const name of Object.keys(proxyReqOpts.headers ?? {})) {
    if (STRIPPED_REQUEST_HEADERS.includes(name.toLowerCase())) delete proxyReqOpts.headers[name];
  }
  return proxyReqOpts;
}

// Log only query parameter names, never values.
function queryKeys(req?: Request) {
  return Object.keys(req?.query ?? {});
}

export function useProxy(express: Express) {
  const log = Log.getInstance();
  const eds = express.config.eds;
  const signProxyUrl = eds?.sign_proxy_url;

  if (signProxyUrl) {
    const { unavailableMessage = 'Service is temporarily unavailable', limit = 1024, timeout = 30000 } = eds!;
    const paths = eds!.sign_proxy_allowed_paths ?? [];
    const methods = eds!.sign_proxy_allowed_methods ?? DEFAULT_METHODS;

    if (!paths.length) {
      // Fail closed: an open relay to the sign backend must be an explicit decision.
      log.save('eds-proxy|disabled', { reason: 'eds.sign_proxy_allowed_paths is empty' }, 'error');
    } else {
      const options: proxy.ProxyOptions = {
        limit,
        timeout,
        proxyReqOptDecorator: stripCredentials,
        userResDecorator: function (proxyRes: IncomingMessage, proxyResData: any, userReq: Request, userRes: Response) {
          // Handle a message about malformed request.
          if (proxyRes.statusCode === 500 && proxyResData.toString() === 'Виникла помилка при обробці запиту') {
            userRes.statusCode = 400;
          } else if (proxyRes.statusCode! >= 300) {
            // Report any other non-success response.
            log.save('eds-proxy|error', { statusCode: proxyRes.statusCode }, 'error');
          }

          return proxyResData;
        },

        proxyErrorHandler: function (err: any, res: Response, next: NextFunction) {
          // Map proxy connection errors to 503 error.
          switch (err?.code) {
            case 'ENOTFOUND':
            case 'ECONNRESET':
            case 'ECONNREFUSED':
            case 'ETIMEDOUT': {
              log.save('eds-proxy|connection-error', { error: err.toString(), queryKeys: queryKeys(res.req) }, 'error');

              return res.status(503).send(unavailableMessage);
            }
            default: {
              log.save('eds-proxy|error', { error: err.toString(), queryKeys: queryKeys(res.req) }, 'error');
              next(err);
            }
          }
        },
      };

      // The sign widget is used before login, so this route cannot require a session; it is opt-in and allow-listed instead.
      express.use('/proxy/authorise/eds/', guard({ methods, paths }), proxy(signProxyUrl, options as any));
    }
  }

  // Opt-in only. Read-only relay of allow-listed ics.gov.ua paths (e.g. CA certificate lists / CRLs).
  const ics = eds?.ics_proxy;
  if (ics?.enabled && ics.allowed_paths?.length) {
    const options: proxy.ProxyOptions = {
      limit: 1024,
      timeout: ics.timeout ?? 30000,
      parseReqBody: false,
      proxyReqOptDecorator: stripCredentials,
      proxyErrorHandler: function (err: any, res: Response) {
        log.save('ics-proxy|error', { error: err?.toString(), queryKeys: queryKeys(res.req) }, 'error');
        return res.status(503).send('Service is temporarily unavailable');
      },
    };

    express.use('/proxy/ics.gov.ua/', guard({ methods: ['GET'], paths: ics.allowed_paths }), proxy(ICS_ORIGIN, options as any));
  }
}
