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

import { LoggerService } from './logger.service';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) =>
        throwError(() => {
          // Dump the stack trace for unhandled errors
          if (!(err instanceof HttpException)) {
            this.logger.error('error-details', {
              message: err.message,
              stack: err.stack,
              cause: err.cause,
            });
            return new InternalServerErrorException('Internal server error');
          }

          // Dump the error details for handled errors
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
