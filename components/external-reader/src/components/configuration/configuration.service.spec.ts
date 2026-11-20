import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigValidationError } from '@liquio/back-core';

import { LoggerService } from '@components/observability/logger.service';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  const originalEnv = { ...process.env };
  let dir: string;
  let logger: jest.Mocked<Pick<LoggerService, 'setContext' | 'error'>>;

  const create = () => new ConfigurationService<any>(logger as unknown as LoggerService);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ext-reader-cfg-'));
    writeFileSync(join(dir, 'server.json'), JSON.stringify({ port: 1234 }));
    process.env = { ...originalEnv, CONFIG_PATH: dir };
    delete process.env.SECRET_PATH;
    delete process.env.LIQUIO_CONFIG_PREFIX;
    logger = { setContext: jest.fn(), error: jest.fn() };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads config files from CONFIG_PATH', () => {
    expect(create().get('server')).toEqual({ port: 1234 });
  });

  it('applies env overrides', () => {
    process.env.LIQUIO_CFG_EXTERNAL_READER_auth = '{"basicAuthTokens":["a:b"]}';
    expect(create().get('auth')).toEqual({ basicAuthTokens: ['a:b'] });
  });

  it('honours LIQUIO_CONFIG_PREFIX', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
    process.env.FOO_auth = '{"basicAuthTokens":["c:d"]}';
    process.env.LIQUIO_CFG_EXTERNAL_READER_auth = '{"basicAuthTokens":["a:b"]}';
    expect(create().get('auth')).toEqual({ basicAuthTokens: ['c:d'] });
  });

  it('throws a generic error without leaking the value', () => {
    process.env.LIQUIO_CFG_EXTERNAL_READER_auth = '{sentinel-secret-value';
    expect(() => create()).toThrow('Unable to load configuration');
    expect(logger.error).toHaveBeenCalledWith('configuration-error', { error: expect.any(String) });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('sentinel-secret-value');
  });

  it('rethrows schema failures and logs them', () => {
    writeFileSync(join(dir, 'server.json'), JSON.stringify({}));
    expect(() => create()).toThrow(ConfigValidationError);
    expect(logger.error).toHaveBeenCalledWith('configuration-error', { error: expect.stringContaining('server.port') });
  });
});
