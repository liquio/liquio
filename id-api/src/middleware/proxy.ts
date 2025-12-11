import proxy from 'express-http-proxy';
import { Response, Request } from 'express';
import { IncomingMessage } from 'http';

import { Log } from '../lib/log';
import { Express, NextFunction } from '../types';

export function useProxy(express: Express) {
  const log = Log.get();
  const signProxyUrl = express.config.eds?.sign_proxy_url;

  if (signProxyUrl) {
    const { unavailableMessage = 'Service is temporarily unavailable', limit = 1024, timeout = 30000 } = express.config.eds!;

    const options: proxy.ProxyOptions = {
      limit,
      timeout,
      userResDecorator: function (proxyRes: IncomingMessage, proxyResData: any, userReq: Request, userRes: Response) {
        // Handle a message about malformed request.
        if (proxyRes.statusCode === 500 && proxyResData.toString() === 'Виникла помилка при обробці запиту') {
          userRes.statusCode = 400;
        } else if (proxyRes.statusCode! >= 300) {
          // Report any other non-success response.
          log.save('eds-proxy|error', { statusCode: proxyRes.statusCode, data: proxyResData.toString(), query: userReq.query }, 'error');
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
            log.save('eds-proxy|connection-error', { error: err.toString(), query: res.req?.query }, 'error');

            return res.status(503).send(unavailableMessage);
          }
          default: {
            log.save('eds-proxy|error', { error: err.toString(), query: res.req?.query }, 'error');
            next(err);
          }
        }
      },
    };

    express.use('/proxy/authorise/eds/', proxy(signProxyUrl, options as any));
  }

  express.use('/proxy/ics.gov.ua/', proxy('https://ics.gov.ua/'));
}
