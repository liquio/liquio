import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy as Strategy } from 'passport-http';

import { AuthConfig } from '@common/types/config.types';
import { Config } from '@lib/config';
import { isBasicAuthTokenAllowed } from '@modules/auth/auth-tokens';

@Injectable()
export class BasicAuthStrategy extends PassportStrategy(Strategy) {
  private readonly basicAuthTokens: string[];

  constructor() {
    super({ passReqToCallback: true });

    this.basicAuthTokens = Config.get<AuthConfig>('auth').basicAuthTokens;
  }

  validate(_req: unknown, username: string, password: string): Promise<boolean> {
    const encodedString = Buffer.from(`${username}:${password}`).toString('base64');
    const token = `Basic ${encodedString}`;
    if (!isBasicAuthTokenAllowed(token, this.basicAuthTokens)) {
      throw new UnauthorizedException();
    }

    return Promise.resolve(true);
  }
}
