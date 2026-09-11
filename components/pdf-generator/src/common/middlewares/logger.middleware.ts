import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { log } from '@lib/log';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl: url, headers } = request;

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
