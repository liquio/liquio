import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import Multiconf from 'multiconf';
import { z } from 'zod';

import { Config } from './config';
import { ConfigLoadError, ConfigValidationError } from './errors';
import * as api from '../index';

const ENV_KEYS = ['CONFIG_PATH', 'SECRET_PATH', 'LIQUIO_CONFIG_PREFIX'];

describe('Config', () => {
  const dirs: string[] = [];
  const touched = new Map<string, string | undefined>();

  const setEnv = (name: string, value: string): void => {
    if (!touched.has(name)) touched.set(name, process.env[name]);
    process.env[name] = value;
  };
  const mkdir = (files: Record<string, unknown | string>): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
    dirs.push(dir);
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
    }
    return dir;
  };

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      touched.set(k, process.env[k]);
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const [k, v] of touched) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    touched.clear();
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  it('is exported from the package index', () => {
    expect(typeof api.Config.load).toBe('function');
    expect(typeof api.resolveEnvPrefix).toBe('function');
    expect(api.ConfigLoadError).toBe(ConfigLoadError);
    expect(api.ConfigValidationError).toBe(ConfigValidationError);
  });

  describe('files', () => {
    it('reads <name>.json as key <name>', () => {
      const dir = mkdir({ 'server.json': { port: 1 } });
      expect(Config.load({ configPath: dir }).get('server')).toEqual({ port: 1 });
    });

    it('uses .json.default only when .json is missing', () => {
      const dir = mkdir({ 'a.json': { v: 'json' }, 'a.json.default': { v: 'default' }, 'b.json.default': { v: 'default' } });
      const cfg = Config.load({ configPath: dir }).toObject();
      expect(cfg.a).toEqual({ v: 'json' });
      expect(cfg.b).toEqual({ v: 'default' });
    });

    it('throws ConfigLoadError for a missing config dir', () => {
      expect(() => Config.load({ configPath: path.join(os.tmpdir(), 'cfg-does-not-exist-xyz') })).toThrow(ConfigLoadError);
    });

    it('names the config but not the content for invalid JSON', () => {
      const dir = mkdir({ 'bad.json': 'secret-sentinel-123{' });
      let error: Error;
      try {
        Config.load({ configPath: dir });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ConfigLoadError);
      expect(error.message).toContain('"bad"');
      expect(error.message).not.toContain('secret-sentinel-123');
      expect(error.message).not.toContain('\n');
    });
  });

  describe('secret dir', () => {
    it('merges deep over the config dir', () => {
      const dir = mkdir({ 'db.json': { host: 'h', pass: 'p', nested: { a: 1, b: 2 } } });
      const secret = mkdir({ 'db.json': { pass: 's', nested: { b: 3 } } });
      const cfg = Config.load({ configPath: dir, secretPath: secret });
      expect(cfg.get('db')).toEqual({ host: 'h', pass: 's', nested: { a: 1, b: 3 } });
    });

    it('is skipped when the path does not exist', () => {
      const dir = mkdir({ 'db.json': { host: 'h' } });
      const cfg = Config.load({ configPath: dir, secretPath: path.join(os.tmpdir(), 'cfg-no-secret-xyz') });
      expect(cfg.get('db')).toEqual({ host: 'h' });
    });

    it('is skipped for null even if SECRET_PATH is set', () => {
      const dir = mkdir({ 'db.json': { host: 'h' } });
      setEnv('SECRET_PATH', mkdir({ 'db.json': { host: 'secret' } }));
      expect(Config.load({ configPath: dir, secretPath: null }).get('db')).toEqual({ host: 'h' });
    });

    it('is taken from SECRET_PATH by default', () => {
      const dir = mkdir({ 'db.json': { host: 'h' } });
      setEnv('SECRET_PATH', mkdir({ 'db.json': { host: 'secret' } }));
      expect(Config.load({ configPath: dir }).get('db')).toEqual({ host: 'secret' });
    });
  });

  describe('path resolution', () => {
    it('explicit configPath beats CONFIG_PATH', () => {
      setEnv('CONFIG_PATH', mkdir({ 'x.json': { from: 'env' } }));
      const dir = mkdir({ 'x.json': { from: 'option' } });
      expect(Config.load({ configPath: dir }).get('x')).toEqual({ from: 'option' });
    });

    it('CONFIG_PATH beats defaultConfigPath', () => {
      setEnv('CONFIG_PATH', mkdir({ 'x.json': { from: 'env' } }));
      const dir = mkdir({ 'x.json': { from: 'default' } });
      expect(Config.load({ defaultConfigPath: dir }).get('x')).toEqual({ from: 'env' });
    });

    it('uses defaultConfigPath last', () => {
      const dir = mkdir({ 'x.json': { from: 'default' } });
      expect(Config.load({ defaultConfigPath: dir }).get('x')).toEqual({ from: 'default' });
    });

    it('throws ConfigLoadError when no path is set', () => {
      expect(() => Config.load()).toThrow(ConfigLoadError);
    });
  });

  describe('env overrides', () => {
    it('replaces a top-level key and sets the lower-case twin', () => {
      const dir = mkdir({ 'server.json': { port: 0, host: 'h' } });
      setEnv('PFX_server', '{"port":1}');
      setEnv('PFX_DB', '{}');
      const cfg = Config.load({ configPath: dir, envPrefix: 'PFX_' }).toObject();
      expect(cfg.server).toEqual({ port: 1 });
      expect(cfg.DB).toEqual({});
      expect(cfg.db).toEqual({});
    });

    it('ignores env without envPrefix', () => {
      const dir = mkdir({ 'server.json': { port: 0 } });
      setEnv('PFX_server', '{"port":1}');
      expect(Config.load({ configPath: dir }).get('server')).toEqual({ port: 0 });
    });

    it('does not leak an invalid env value', () => {
      const dir = mkdir({ 'a.json': {} });
      setEnv('PFX_x', 'secret-sentinel-123{');
      let error: Error;
      try {
        Config.load({ configPath: dir, envPrefix: 'PFX_' });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ConfigLoadError);
      expect(error.message).not.toContain('secret-sentinel-123');
    });

    it('matches Multiconf.get for config + secret + env', () => {
      const dir = mkdir({ 'db.json': { host: 'h', nested: { a: 1 } }, 'app.json.default': { n: 1 } });
      const secret = mkdir({ 'db.json': { pass: 's' } });
      setEnv('PFX_app', '{"n":2}');
      setEnv('PFX_extra', '[1,2]');
      const expected = Multiconf.get([dir, secret], 'PFX_');
      const actual = Config.load({ configPath: dir, secretPath: secret, envPrefix: 'PFX_' }).toObject();
      expect(actual).toEqual(expected);
    });
  });

  describe('legacy prefixes', () => {
    it('applies when the current-prefix twin is absent', () => {
      const dir = mkdir({ 'a.json': {} });
      setEnv('OLD_db', '{"x":1}');
      const cfg = Config.load({ configPath: dir, envPrefix: 'NEW_', legacyEnvPrefixes: ['OLD_'] }).toObject();
      expect(cfg.db).toEqual({ x: 1 });
    });

    it('is skipped when the current prefix twin is set', () => {
      const dir = mkdir({ 'a.json': {} });
      setEnv('OLD_db', '{"x":1}');
      setEnv('NEW_db', '{"x":2}');
      const cfg = Config.load({ configPath: dir, envPrefix: 'NEW_', legacyEnvPrefixes: ['OLD_'] }).toObject();
      expect(cfg.db).toEqual({ x: 2 });
    });

    it('rejects invalid JSON without the value', () => {
      const dir = mkdir({ 'a.json': {} });
      setEnv('OLD_db', 'secret-sentinel-123{');
      let error: Error;
      try {
        Config.load({ configPath: dir, envPrefix: 'NEW_', legacyEnvPrefixes: ['OLD_'] });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ConfigLoadError);
      expect(error.message).toBe(`Can't parse env config "OLD_db".`);
    });

    it('with a legacy prefix that extends the current one yields db and the junk _db', () => {
      const dir = mkdir({ 'a.json': {} });
      setEnv('A__db', '{"x":1}');
      const cfg = Config.load({ configPath: dir, envPrefix: 'A_', legacyEnvPrefixes: ['A__'] }).toObject();
      expect(cfg.db).toEqual({ x: 1 });
      expect(cfg._db).toEqual({ x: 1 });
    });
  });

  describe('transform', () => {
    it('picks a nested section', () => {
      const dir = mkdir({ 'env.json': { prod: { a: 1 }, dev: { a: 2 } } });
      const cfg = Config.load({ configPath: dir, transform: (raw) => raw.env.prod });
      expect(cfg.toObject()).toEqual({ a: 1 });
    });

    it('rejects non-object results', () => {
      expect(() => Config.fromObject({ a: 1 }, { transform: () => 'x' })).toThrow(ConfigLoadError);
      expect(() => Config.fromObject({ a: 1 }, { transform: () => [1] })).toThrow(ConfigLoadError);
      expect(() => Config.fromObject(null)).toThrow(ConfigLoadError);
    });
  });

  describe('defaults', () => {
    interface C {
      server: { port: number; host: string };
      list: number[];
      opt: string | null;
      keep: string;
    }

    it('merges nested, replaces arrays, null wins, undefined keeps default', () => {
      const cfg = Config.fromObject<C>(
        { server: { port: 2 }, list: [3], opt: null, keep: undefined },
        { defaults: { server: { port: 1, host: 'h' }, list: [1, 2], opt: 'x', keep: 'k' } },
      ).toObject();
      expect(cfg).toEqual({ server: { port: 2, host: 'h' }, list: [3], opt: null, keep: 'k' });
    });

    it('does not mutate defaults across loads', () => {
      const defaults = { server: { port: 1, host: 'h' } };
      const a = Config.fromObject<C>({ server: { port: 2 } }, { defaults }).toObject();
      a.server.host = 'changed';
      const b = Config.fromObject<C>({}, { defaults }).toObject();
      expect(b.server).toEqual({ port: 1, host: 'h' });
      expect(defaults).toEqual({ server: { port: 1, host: 'h' } });
    });

    it('keeps the same reference without defaults', () => {
      const obj = { a: 1 };
      const cfg = Config.fromObject(obj);
      expect(cfg.toObject()).toBe(obj);
      expect(cfg.toObject()).toBe(cfg.toObject());
    });
  });

  describe('schema', () => {
    const schema = z.object({ server: z.object({ port: z.number() }) });

    it('passes valid config and keeps unknown keys', () => {
      const cfg = Config.fromObject({ server: { port: 1 }, extra: true }, { schema: schema as any });
      expect(cfg.toObject()).toEqual({ server: { port: 1 }, extra: true });
    });

    it('throws ConfigValidationError without the invalid value', () => {
      let error: ConfigValidationError;
      try {
        Config.fromObject({ server: { port: 'secret-sentinel-123' } }, { schema: schema as any });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect(error.issues[0].path).toBe('server.port');
      expect(error.issues[0].code).toBe('invalid_type');
      expect(error.message).not.toContain('secret-sentinel-123');
      expect(JSON.stringify(error.issues)).not.toContain('secret-sentinel-123');
    });
  });
});
