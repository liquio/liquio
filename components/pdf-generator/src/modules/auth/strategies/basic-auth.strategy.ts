import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy as Strategy } from 'passport-http';

import { AuthConfig } from '@common/types/config.types';
import { Config } from '@lib/config';

@Injectable()
export class BasicAuthStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ passReqToCallback: true });
  }

  validate(_req: unknown, username: string, password: string): Promise<boolean> {
    const { basicAuthTokens } = Config.get<AuthConfig>('auth');

    const encodedString = Buffer.from(`${username}:${password}`).toString('base64');
    const token = `Basic ${encodedString}`;
    if (!basicAuthTokens.includes(token)) {
      throw new UnauthorizedException();
    }

    return Promise.resolve(true);
  }
}
