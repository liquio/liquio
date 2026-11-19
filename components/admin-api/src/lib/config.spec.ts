import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadAdminApiConfig } from './config';

const ENV_KEYS = [
  'CONFIG_PATH',
  'SECRET_PATH',
  'LIQUIO_CONFIG_PREFIX',
  'LIQUIO_CFG_ADMIN_API_HANDLER_server',
  'LIQUIO_CFG_ADMIN_API_server',
  'FOO_HANDLER_server',
];

describe('loadAdminApiConfig', () => {
  let tmp: string;
  let configDir: string;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    ENV_KEYS.forEach((k) => delete process.env[k]);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-api-config-'));
    configDir = path.join(tmp, 'config');
    fs.mkdirSync(configDir);
    fs.writeFileSync(path.join(configDir, 'server.json'), JSON.stringify({ token: 'from-file', port: 1 }));
    process.env.CONFIG_PATH = configDir;
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('applies the default prefix with the _HANDLER_ suffix', () => {
    process.env.LIQUIO_CFG_ADMIN_API_HANDLER_server = '{"token":"t"}';
    expect(loadAdminApiConfig().server.token).toBe('t');
  });

  it('ignores the prefix without the _HANDLER_ suffix', () => {
    process.env.LIQUIO_CFG_ADMIN_API_server = '{"token":"t"}';
    expect(loadAdminApiConfig().server.token).toBe('from-file');
  });

  it('uses LIQUIO_CONFIG_PREFIX with the _HANDLER_ suffix', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
    process.env.FOO_HANDLER_server = '{"token":"foo"}';
    expect(loadAdminApiConfig().server.token).toBe('foo');
  });

  it('reads files from CONFIG_PATH', () => {
    expect(loadAdminApiConfig().server).toEqual({ token: 'from-file', port: 1 });
  });

  it('merges SECRET_PATH over CONFIG_PATH', () => {
    const secretDir = path.join(tmp, 'secret');
    fs.mkdirSync(secretDir);
    fs.writeFileSync(path.join(secretDir, 'server.json'), JSON.stringify({ token: 'secret-token' }));
    process.env.SECRET_PATH = secretDir;
    expect(loadAdminApiConfig().server).toEqual({ token: 'secret-token', port: 1 });
  });
});
