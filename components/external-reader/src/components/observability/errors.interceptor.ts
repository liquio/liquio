import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LoggerService } from '@components/observability/logger.service';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err) =>
        throwError(() => {
          if (!(err instanceof HttpException)) {
            this.logger.error('error-details', {
              message: err.message,
              stack: err.stack,
              cause: err.cause,
            });
            return new InternalServerErrorException('Internal server error');
          }

          if (err.cause) {
            this.logger.error('error-cause', {
              message: err.message,
              cause: err.cause,
            });
          }

          return err;
        }),
      ),
    );
  }
}
