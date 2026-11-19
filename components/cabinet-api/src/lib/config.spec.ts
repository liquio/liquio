import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCabinetApiConfig } from './config';

describe('loadCabinetApiConfig', () => {
  const saved = { ...process.env };
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cabinet-cfg-'));
    writeFileSync(join(dir, 'server.json'), JSON.stringify({ port: 1 }));
    delete process.env.LIQUIO_CONFIG_PREFIX;
    delete process.env.SECRET_PATH;
    process.env.CONFIG_PATH = dir;
  });

  afterEach(() => {
    process.env = { ...saved };
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads the default LIQUIO_CFG_CABINET_ prefix', () => {
    process.env.LIQUIO_CFG_CABINET_SERVER = '{"port":2}';
    process.env.LIQUIO_CFG_CABINET_API_SERVER = '{"port":3}';
    expect(loadCabinetApiConfig().server.port).toBe(2);
  });

  it('honours LIQUIO_CONFIG_PREFIX', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'CUSTOM';
    process.env.CUSTOM_SERVER = '{"port":4}';
    expect(loadCabinetApiConfig().server.port).toBe(4);
  });

  it('loads files from CONFIG_PATH', () => {
    expect(loadCabinetApiConfig().server.port).toBe(1);
  });

  it('merges SECRET_PATH and ignores a missing one', () => {
    const secret = mkdtempSync(join(tmpdir(), 'cabinet-sec-'));
    writeFileSync(join(secret, 'server.json'), JSON.stringify({ extra: 'x' }));
    process.env.SECRET_PATH = secret;
    expect(loadCabinetApiConfig().server.extra).toBe('x');
    rmSync(secret, { recursive: true, force: true });
    expect(loadCabinetApiConfig().server.port).toBe(1);
  });
});
