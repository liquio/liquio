import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import 'reflect-metadata';

import { LoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    const req = context.switchToHttp().getRequest();

    const { method, url } = req;

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    this.logger.log('http-request', { method, url, ip });

    return next.handle().pipe(
      tap(() => {
        const status = context.switchToHttp().getResponse().statusCode;
        this.logger.log('http-response', {
          method,
          url,
          status,
          duration: Date.now() - now,
        });
      }),
      catchError((error) => {
        this.logger.error('http-response', {
          method,
          url,
          status: error.status,
          error: error.message,
          duration: Date.now() - now,
        });
        throw error;
      }),
    );
  }
}
