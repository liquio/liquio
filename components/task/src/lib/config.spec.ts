import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const setAppContext = jest.fn();
jest.mock('./context', () => ({ setAppContext }));

type ConfigModule = typeof import('./config');

const ENV_KEYS = ['LIQUIO_BPMN_TASK_server', 'LIQUIO_CFG_TASK_server', 'LIQUIO_CONFIG_PREFIX', 'SECRET_PATH', 'CONFIG_PATH'];

describe('lib/config', () => {
  const dirs: string[] = [];
  const savedEnv: Record<string, string | undefined> = {};

  const makeDir = (files: Record<string, unknown>): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-config-'));
    dirs.push(dir);
    for (const [name, value] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(value));
    }
    return dir;
  };

  const load = (): ConfigModule => {
    let mod: ConfigModule | undefined;
    jest.isolateModules(() => {
      mod = require('./config');
    });
    return mod as ConfigModule;
  };

  beforeEach(() => {
    setAppContext.mockClear();
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    while (dirs.length) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('reads <name>.json from the config directory', () => {
    const dir = makeDir({ server: { port: 8 } });
    expect(load().loadConfig(dir).server).toEqual({ port: 8 });
  });

  it('overrides a section from LIQUIO_BPMN_TASK_ env', () => {
    const dir = makeDir({ server: { port: 8 } });
    process.env.LIQUIO_BPMN_TASK_server = '{"port":1}';
    expect(load().loadConfig(dir).server).toEqual({ port: 1 });
  });

  it('ignores LIQUIO_CFG_TASK_ env and LIQUIO_CONFIG_PREFIX', () => {
    const dir = makeDir({ server: { port: 8 } });
    process.env.LIQUIO_CFG_TASK_server = '{"port":2}';
    process.env.LIQUIO_CONFIG_PREFIX = 'OTHER';
    process.env.OTHER_server = '{"port":3}';
    try {
      expect(load().loadConfig(dir).server).toEqual({ port: 8 });
    } finally {
      delete process.env.OTHER_server;
    }
  });

  it('merges the SECRET_PATH directory over the config', () => {
    const dir = makeDir({ server: { port: 8 } });
    process.env.SECRET_PATH = makeDir({ server: { port: 9 } });
    expect(load().loadConfig(dir).server).toEqual({ port: 9 });
  });

  it('uses the explicit config path regardless of CONFIG_PATH env', () => {
    const dir = makeDir({ server: { port: 8 } });
    process.env.CONFIG_PATH = makeDir({ server: { port: 5 } });
    expect(load().loadConfig(dir).server).toEqual({ port: 8 });
  });

  it('getConfig returns the loaded object and sets the app context', () => {
    const dir = makeDir({ server: { port: 8 } });
    const mod = load();
    const loaded = mod.loadConfig(dir);
    expect(mod.getConfig()).toBe(loaded);
    expect(setAppContext).toHaveBeenCalledWith({ config: loaded });
  });

  it('getConfig throws before load', () => {
    expect(() => load().getConfig()).toThrow('Config not loaded');
  });
});
