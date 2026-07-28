import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';

import { LoggerService } from '@components/observability/logger.service';

import { ProviderMethodArgs } from './base.provider';
import { ProvidersService } from './providers.service';

@Controller()
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly logger: LoggerService,
  ) {}

  @Post(':service/:method')
  @ApiResponse({
    status: 200,
    description: 'Method executed successfully',
    type: Object,
  })
  async handleProviderRequest(
    @Param('service') service: string,
    @Param('method') method: string,
    @Body() body: ProviderMethodArgs,
    @Res() res: Response,
  ) {
    try {
      this.logger.log('provider-controller|request', {
        service,
        method,
        bodySize: JSON.stringify(body).length,
      });

      const methodHandler = this.providersService.getMethod(service, method);
      if (!methodHandler) {
        this.logger.error('provider-controller|method-not-found', {
          service,
          method,
        });
        throw new BadRequestException(`Method ${method} not found for service ${service}`);
      }

      try {
        const request = await methodHandler(body);
        return res.status(200).json(request);
      } catch (error) {
        if (error instanceof HttpException) {
          this.logger.error('provider-controller|method-execution-failed', {
            service,
            method,
            error: error.message,
          });
          throw error;
        }

        this.logger.error('provider-controller|method-unhandled-error', {
          service,
          method,
          error: error.message,
          stack: error.stack,
        });
        throw new InternalServerErrorException(
          error,
          `Error executing method ${method} for service ${service}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error('provider-controller|request-failed', {
        service,
        method,
        error: error.message,
      });

      throw error;
    }
  }
}
