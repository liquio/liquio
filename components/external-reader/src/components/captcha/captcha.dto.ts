import { ApiProperty } from '@nestjs/swagger';

export interface Challenge {
  algorithm: string;
  challenge: string;
  maxnumber?: number;
  salt: string;
  signature: string;
}

export class GetProviderListResponse {
  @ApiProperty({
    description: 'List of available captcha providers',
    type: [String],
  })
  isEnabledFor: string[];
}

export class GetCaptchaResponse {
  @ApiProperty({
    description: 'Captcha challenge',
  })
  challenge: Challenge;
}
