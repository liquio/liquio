import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadGatewayConfig } from './config';

const ENV_KEYS = ['LIQUIO_CFG_GATEWAY_app', 'FOO_app', 'LIQUIO_CONFIG_PREFIX', 'CONFIG_PATH', 'SECRET_PATH'];

describe('gateway config loader', () => {
  const saved: Record<string, string | undefined> = {};
  const dirs: string[] = [];
  const cwd = process.cwd();

  const makeDir = (files: Record<string, unknown>): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-config-'));
    dirs.push(dir);
    for (const [name, value] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(value));
    }
    return dir;
  };

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.chdir(cwd);
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('applies LIQUIO_CFG_GATEWAY_ env overrides', () => {
    process.env.LIQUIO_CFG_GATEWAY_app = '{"x":1}';
    const dir = makeDir({ app: { x: 0 } });
    expect(loadGatewayConfig(dir).app).toEqual({ x: 1 });
  });

  it('uses LIQUIO_CONFIG_PREFIX instead of the default prefix', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
    process.env.FOO_app = '{"x":2}';
    process.env.LIQUIO_CFG_GATEWAY_app = '{"x":3}';
    const dir = makeDir({ app: { x: 0 } });
    expect(loadGatewayConfig(dir).app).toEqual({ x: 2 });
  });

  it('reads ../config/gateway when no path is given', () => {
    const root = makeDir({});
    const work = path.join(root, 'work');
    fs.mkdirSync(work);
    fs.mkdirSync(path.join(root, 'config', 'gateway'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config', 'gateway', 'app.json'), JSON.stringify({ from: 'default' }));
    process.chdir(work);
    expect(loadGatewayConfig().app).toEqual({ from: 'default' });
  });

  it('prefers CONFIG_PATH over the default path', () => {
    process.env.CONFIG_PATH = makeDir({ app: { from: 'env' } });
    expect(loadGatewayConfig().app).toEqual({ from: 'env' });
  });

  it('prefers an explicit path over CONFIG_PATH', () => {
    process.env.CONFIG_PATH = makeDir({ app: { from: 'env' } });
    const dir = makeDir({ app: { from: 'explicit' } });
    expect(loadGatewayConfig(dir).app).toEqual({ from: 'explicit' });
  });

  it('merges SECRET_PATH over the config dir', () => {
    process.env.SECRET_PATH = makeDir({ app: { token: 'secret' } });
    const dir = makeDir({ app: { token: 'plain', other: 1 } });
    expect(loadGatewayConfig(dir).app).toEqual({ token: 'secret', other: 1 });
  });

  it('ignores a missing SECRET_PATH', () => {
    process.env.SECRET_PATH = path.join(os.tmpdir(), 'gateway-config-missing-dir');
    const dir = makeDir({ app: { x: 0 } });
    expect(loadGatewayConfig(dir).app).toEqual({ x: 0 });
  });
});
