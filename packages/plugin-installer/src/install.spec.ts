import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import { installPlugins, InstallDependencies, InstallOptions } from './install';

jest.mock('node:fs');
jest.mock('node:child_process');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedChildProcess = childProcess as jest.Mocked<typeof childProcess>;

function createDeps(overrides: Partial<InstallDependencies> = {}): jest.Mocked<InstallDependencies> {
  return {
    loadConfig: jest.fn().mockReturnValue({}),
    log: jest.fn(),
    ...overrides,
  } as jest.Mocked<InstallDependencies>;
}

function mockSpawnResult(overrides: Partial<childProcess.SpawnSyncReturns<string>> = {}) {
  return {
    pid: 1,
    output: ['', '', ''],
    stdout: '',
    stderr: '',
    status: 0,
    signal: null,
    ...overrides,
  } as childProcess.SpawnSyncReturns<string>;
}

const options: InstallOptions = {
  configDir: '/config',
  envConfigPrefix: 'LIQUIO_CFG_PLUGIN_INSTALLER_',
  installDir: '/plugins',
  registry: 'https://registry.npmjs.org',
};

describe('installPlugins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    mockedChildProcess.spawnSync.mockReturnValue(mockSpawnResult());
  });

  it('logs and does nothing when the config directory does not exist', async () => {
    mockedFs.existsSync.mockReturnValue(false);
    const deps = createDeps();

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith('plugin-installer-no-config-dir', { configDir: options.configDir });
    expect(deps.loadConfig).not.toHaveBeenCalled();
    expect(mockedChildProcess.spawnSync).not.toHaveBeenCalled();
  });

  it('logs and does nothing when the config directory exists but has no plugins.json', async () => {
    const deps = createDeps({ loadConfig: jest.fn().mockReturnValue({}) });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith('plugin-installer-no-plugins-config', { configDir: options.configDir });
    expect(mockedChildProcess.spawnSync).not.toHaveBeenCalled();
  });

  it('logs and does nothing when there are no enabled plugins (all disabled)', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: false }] },
      }),
    });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith('plugin-installer-no-enabled-plugins');
    expect(mockedChildProcess.spawnSync).not.toHaveBeenCalled();
  });

  it('logs and does nothing when the plugins array is empty', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({ plugins: { plugins: [] } }),
    });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith('plugin-installer-no-enabled-plugins');
    expect(mockedChildProcess.spawnSync).not.toHaveBeenCalled();
  });

  it('installs only the enabled plugin when one is enabled and one is disabled', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: {
          plugins: [
            { package: 'enabled-pkg', version: '1.2.3', isEnabled: true },
            { package: 'disabled-pkg', version: '4.5.6', isEnabled: false },
          ],
        },
      }),
    });

    await installPlugins(options, deps);

    expect(mockedChildProcess.spawnSync).toHaveBeenCalledTimes(1);
    const [cmd, args] = mockedChildProcess.spawnSync.mock.calls[0];
    expect(cmd).toBe('npm');
    expect(args).toContain('enabled-pkg@1.2.3');
    expect(args).not.toContain('disabled-pkg@4.5.6');
    expect((args as string[]).join(' ')).not.toContain('disabled-pkg');
  });

  it('passes --ignore-scripts by default', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }] },
      }),
    });

    await installPlugins(options, deps);

    const [, args] = mockedChildProcess.spawnSync.mock.calls[0];
    expect(args).toContain('--ignore-scripts');
  });

  it('omits --ignore-scripts when plugins.json sets allowInstallScripts', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: {
          plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }],
          allowInstallScripts: true,
        },
      }),
    });

    await installPlugins(options, deps);

    const [, args] = mockedChildProcess.spawnSync.mock.calls[0];
    expect(args).not.toContain('--ignore-scripts');
  });

  it('uses the registry from plugins.json when set, overriding the default registry', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: {
          plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }],
          registry: 'https://plugins.registry.internal',
        },
      }),
    });

    await installPlugins(options, deps);

    const [, args] = mockedChildProcess.spawnSync.mock.calls[0];
    expect(args).toContain('https://plugins.registry.internal');
    expect(args).not.toContain(options.registry);
  });

  it('falls back to options.registry when plugins.json has no registry', async () => {
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }] },
      }),
    });

    await installPlugins(options, deps);

    const [, args] = mockedChildProcess.spawnSync.mock.calls[0];
    expect(args).toContain(options.registry);
  });

  it('clears node_modules/package-lock.json (not the installDir mount point itself), then mkdirSync/writeFileSync, before spawnSync', async () => {
    const callOrder: string[] = [];
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }] },
      }),
    });

    mockedFs.rmSync.mockImplementation(() => {
      callOrder.push('rmSync');
    });
    mockedFs.mkdirSync.mockImplementation(() => {
      callOrder.push('mkdirSync');
      return undefined;
    });
    mockedFs.writeFileSync.mockImplementation(() => {
      callOrder.push('writeFileSync');
    });
    mockedChildProcess.spawnSync.mockImplementation(() => {
      callOrder.push('spawnSync');
      return mockSpawnResult();
    });

    await installPlugins(options, deps);

    expect(mockedFs.rmSync).not.toHaveBeenCalledWith(options.installDir, expect.anything());
    expect(mockedFs.rmSync).toHaveBeenCalledWith(expect.stringContaining('node_modules'), { recursive: true, force: true });
    expect(mockedFs.rmSync).toHaveBeenCalledWith(expect.stringContaining('package-lock.json'), { force: true });
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(options.installDir, { recursive: true });
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining(options.installDir), expect.any(String));
    expect(callOrder).toEqual(['rmSync', 'rmSync', 'mkdirSync', 'writeFileSync', 'spawnSync']);
  });

  it('logs npm stdout/stderr via deps.log instead of leaking them to the process stdio', async () => {
    mockedChildProcess.spawnSync.mockReturnValue(mockSpawnResult({ stdout: 'added 1 package', stderr: 'npm warn deprecated foo@1.0.0' }));
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }] },
      }),
    });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith('plugin-installer-npm-stdout', { output: 'added 1 package' });
    expect(deps.log).toHaveBeenCalledWith('plugin-installer-npm-stderr', { output: 'npm warn deprecated foo@1.0.0' }, 'warning');
  });

  it('throws when npm exits with a non-zero status and logs stderr as an error', async () => {
    mockedChildProcess.spawnSync.mockReturnValue(mockSpawnResult({ status: 1, stderr: 'ENOTEMPTY: directory not empty' }));
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }] },
      }),
    });

    await expect(installPlugins(options, deps)).rejects.toThrow('npm install exited with status 1');

    expect(deps.log).toHaveBeenCalledWith('plugin-installer-npm-stderr', { output: 'ENOTEMPTY: directory not empty' }, 'error');
  });

  it('propagates a spawn-level error (e.g. npm binary not found)', async () => {
    const error = new Error('spawn npm ENOENT');
    mockedChildProcess.spawnSync.mockReturnValue(mockSpawnResult({ error, status: null }));
    const deps = createDeps({
      loadConfig: jest.fn().mockReturnValue({
        plugins: { plugins: [{ package: 'foo', version: '1.0.0', isEnabled: true }] },
      }),
    });

    await expect(installPlugins(options, deps)).rejects.toThrow('spawn npm ENOENT');
  });
});
