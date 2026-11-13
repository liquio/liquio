import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

interface ExceptionResponse {
  statusCode: number;
  message: string;
  error: string;
}

@Catch()
export class GlobalExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = this.getStatusCode<T>(exception);
    const message = this.getErrorMessage<T>(exception);

    response.status(statusCode).json({
      data: {
        result: {
          statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
        message,
      },
    });
  }

  private getErrorMessage<T>(exception: T) {
    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      const errorMessage = (errorResponse as ExceptionResponse).message || exception.message;

      return `${exception.name}: ${errorMessage}`;
    }

    if (exception instanceof Error) {
      const errorName = exception.name || 'Error';
      const errorMessage = exception.message || 'Unknown error';
      return `${errorName}: ${errorMessage}`;
    }

    return 'Internal Server Error';
  }

  private getStatusCode<T>(exception: T) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
