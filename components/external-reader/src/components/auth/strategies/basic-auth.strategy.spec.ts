import { UnauthorizedException } from '@nestjs/common';

import { ConfigurationService } from '@components/configuration/configuration.service';
import { BasicAuthStrategy } from './basic-auth.strategy';

const strategyFor = (auth: unknown) => new BasicAuthStrategy({ get: () => auth } as unknown as ConfigurationService);

describe('BasicAuthStrategy', () => {
  it('accepts a configured token', async () => {
    await expect(strategyFor({ basicAuthTokens: ['reader:s3cretvalue'] }).validate({}, 'reader', 's3cretvalue')).resolves.toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(() => strategyFor({ basicAuthTokens: ['reader:s3cretvalue'] }).validate({}, 'reader', 'nope')).toThrow(UnauthorizedException);
  });

  it('rejects everything when no tokens are configured', () => {
    expect(() => strategyFor({ basicAuthTokens: [] }).validate({}, 'reader', 'x')).toThrow(UnauthorizedException);
    expect(() => strategyFor({}).validate({}, 'reader', 'x')).toThrow(UnauthorizedException);
    expect(() => strategyFor(undefined).validate({}, 'reader', 'x')).toThrow(UnauthorizedException);
  });
});
