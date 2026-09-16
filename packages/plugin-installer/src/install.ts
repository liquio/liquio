import path from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Log } from '@liquio/back-core';

export interface InstallOptions {
  configDir: string;
  envConfigPrefix: string;
  installDir: string;
  registry: string;
}

export interface InstallDependencies {
  loadConfig: (configDir: string, envConfigPrefix: string) => Record<string, unknown>;
  log: Log['save'];
}

export interface PluginEntry {
  package: string;
  version: string;
  isEnabled: boolean;
}

export interface PluginsConfig {
  plugins?: PluginEntry[];
  registry?: string;
  allowInstallScripts?: boolean;
}

export async function installPlugins(options: InstallOptions, deps: InstallDependencies): Promise<void> {
  if (!existsSync(options.configDir)) {
    deps.log('plugin-installer-no-config-dir', { configDir: options.configDir });
    return;
  }

  const config = deps.loadConfig(options.configDir, options.envConfigPrefix);
  const pluginsConfig = config.plugins as PluginsConfig | undefined;

  if (!pluginsConfig) {
    deps.log('plugin-installer-no-plugins-config', { configDir: options.configDir });
    return;
  }

  const plugins = (pluginsConfig.plugins || []).filter((p) => p.isEnabled);

  if (plugins.length === 0) {
    deps.log('plugin-installer-no-enabled-plugins');
    return;
  }

  // installDir is a persistent volume mount shared across pod restarts - the mount
  // point itself can't be removed (and the root fs is typically read-only), so only
  // clear its contents. This avoids a leftover node_modules from a previous run
  // colliding with npm's rename-based package swap (ENOTEMPTY on some volume types).
  rmSync(path.join(options.installDir, 'node_modules'), { recursive: true, force: true });
  rmSync(path.join(options.installDir, 'package-lock.json'), { force: true });
  mkdirSync(options.installDir, { recursive: true });
  writeFileSync(
    path.join(options.installDir, 'package.json'),
    JSON.stringify({ name: 'installed-plugins', version: '0.0.0', private: true }, null, 2),
  );

  const specs = plugins.map((p) => `${p.package}@${p.version}`);
  const registry = pluginsConfig.registry || options.registry;
  const allowInstallScripts = pluginsConfig.allowInstallScripts ?? false;
  deps.log('plugin-installer-installing', { plugins: specs, registry, allowInstallScripts });

  const npmArgs = ['install', '--omit=dev', '--registry', registry];
  if (!allowInstallScripts) {
    // Plugin packages are arbitrary third-party code - don't let their
    // preinstall/install/postinstall scripts run unless explicitly opted in.
    npmArgs.push('--ignore-scripts');
  }
  npmArgs.push(...specs);

  const result = spawnSync('npm', npmArgs, {
    cwd: options.installDir,
    encoding: 'utf8',
  });

  if (result.stdout) {
    deps.log('plugin-installer-npm-stdout', { output: result.stdout });
  }
  if (result.stderr) {
    deps.log('plugin-installer-npm-stderr', { output: result.stderr }, result.status === 0 ? 'warning' : 'error');
  }

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`npm install exited with status ${result.status}`);
  }

  deps.log('plugin-installer-done', { plugins: specs });
}
