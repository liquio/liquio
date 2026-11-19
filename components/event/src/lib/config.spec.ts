import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getConfig, loadConfig } from './config';

const legacyPrefix = ['KITSOFT', 'BPMN', 'EVENT', ''].join('_');
const ENV_KEYS = ['LIQUIO_CFG_EVENT_app', 'FOO_app', `${legacyPrefix}app`, 'LIQUIO_CONFIG_PREFIX', 'CONFIG_PATH', 'SECRET_PATH'];

describe('event config loader', () => {
  const saved: Record<string, string | undefined> = {};
  const dirs: string[] = [];

  const makeDir = (files: Record<string, unknown>): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'event-config-'));
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
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('applies LIQUIO_CFG_EVENT_ env overrides', () => {
    process.env.LIQUIO_CFG_EVENT_app = '{"x":1}';
    const dir = makeDir({ app: { x: 0 } });
    expect(loadConfig(dir).app).toEqual({ x: 1 });
  });

  it('uses LIQUIO_CONFIG_PREFIX instead of the default prefix', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'FOO';
    process.env.FOO_app = '{"x":2}';
    process.env.LIQUIO_CFG_EVENT_app = '{"x":3}';
    const dir = makeDir({ app: { x: 0 } });
    expect(loadConfig(dir).app).toEqual({ x: 2 });
  });

  it('ignores the removed legacy prefix', () => {
    process.env[`${legacyPrefix}app`] = '{"x":9}';
    const dir = makeDir({ app: { x: 0 } });
    expect(loadConfig(dir).app).toEqual({ x: 0 });
  });

  it('prefers CONFIG_PATH over the default path', () => {
    process.env.CONFIG_PATH = makeDir({ app: { from: 'env' } });
    expect(loadConfig().app).toEqual({ from: 'env' });
  });

  it('prefers an explicit path over CONFIG_PATH', () => {
    process.env.CONFIG_PATH = makeDir({ app: { from: 'env' } });
    const dir = makeDir({ app: { from: 'explicit' } });
    expect(loadConfig(dir).app).toEqual({ from: 'explicit' });
  });

  it('merges SECRET_PATH over the config dir', () => {
    process.env.SECRET_PATH = makeDir({ app: { token: 'secret' } });
    const dir = makeDir({ app: { token: 'plain', other: 1 } });
    expect(loadConfig(dir).app).toEqual({ token: 'secret', other: 1 });
  });

  it('getConfig returns the loaded object', () => {
    const dir = makeDir({ app: { x: 1 } });
    const loaded = loadConfig(dir);
    expect(getConfig()).toBe(loaded);
  });

  it('getConfig throws before load', () => {
    jest.isolateModules(() => {
      const fresh = require('./config');
      expect(() => fresh.getConfig()).toThrow('Config not loaded');
    });
  });
});
