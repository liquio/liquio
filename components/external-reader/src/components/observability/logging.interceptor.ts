import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { LoggerService } from '@components/observability/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private appInfo: { name: string; version: string };

  constructor(private readonly logger: LoggerService) {
    this.prepareAppInfo();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();

    const req = context.switchToHttp().getRequest<Request>();

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

  private prepareAppInfo() {
    if (!this.appInfo) {
      try {
        const packageJsonPath = join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        this.appInfo = {
          name: packageJson.name,
          version: packageJson.version,
        };
      } catch {
        const name = process.cwd().split('/').pop() || 'Unknown';
        this.appInfo = {
          name,
          version: 'Unknown',
        };
      }
    }
  }
}
