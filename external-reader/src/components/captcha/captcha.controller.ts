import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { Public } from '@common/decorators';

import { GetCaptchaResponse, GetProviderListResponse } from './captcha.dto';
import { CaptchaService } from './captcha.service';

@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Public()
  @Get('providers/list')
  @ApiResponse({
    status: 200,
    description: 'List of available captcha providers',
    type: GetProviderListResponse,
  })
  async getProviderList(): Promise<GetProviderListResponse> {
    const providers = this.captchaService.getCaptchaProviderList();
    return { isEnabledFor: providers };
  }

  @Get(':service/:method')
  @ApiResponse({
    status: 200,
    description: 'Get captcha for the specified service and method',
    type: GetCaptchaResponse,
  })
  async getCaptcha(
    @Param('service') service: string,
    @Param('method') method: string,
  ): Promise<GetCaptchaResponse | null> {
    const challenge = await this.captchaService.getCaptcha(service, method);

    if (!challenge) {
      return null;
    }

    return { challenge };
  }
}
