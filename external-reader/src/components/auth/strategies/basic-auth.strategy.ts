import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy as Strategy } from 'passport-http';

import { ConfigurationService } from '@components/configuration/configuration.service';

@Injectable()
export class BasicAuthStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigurationService) {
    super({ passReqToCallback: true });
  }

  validate(_req: unknown, username: string, password: string): Promise<boolean> {
    const { basicAuthTokens } = this.configService.get('auth');

    if (!basicAuthTokens.includes(`${username}:${password}`)) {
      throw new UnauthorizedException();
    }

    return Promise.resolve(true);
  }
}
