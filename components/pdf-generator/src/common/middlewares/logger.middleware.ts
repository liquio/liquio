import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { log } from '@lib/log';
import { sanitizeUrl } from '@lib/log/helpers';

// Only these request headers are logged. Authorization, cookie and other credentials never are.
const LOGGED_HEADERS = ['user-agent', 'content-length', 'content-type'];

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, headers: requestHeaders } = request;
    // Query string may carry secrets.
    const url = sanitizeUrl(originalUrl, 500);
    const headers = Object.fromEntries(
      LOGGED_HEADERS.filter((name) => requestHeaders?.[name] !== undefined).map((name) => [name, requestHeaders[name]]),
    );

    response.on('close', () => {
      const { statusCode } = response;
      log.save('http-request', {
        url,
        method,
        statusCode,
        headers,
      });
    });

    next();
  }
}
