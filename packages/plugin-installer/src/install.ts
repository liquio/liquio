import path from 'node:path';

export interface InstallOptions {
  configDir: string;
  envConfigPrefix: string;
  installDir: string;
  registry: string;
}

export interface InstallDependencies {
  existsSync: (p: string) => boolean;
  loadConfig: (configDir: string, envConfigPrefix: string) => Record<string, unknown>;
  mkdirSync: (p: string) => void;
  writeFileSync: (p: string, contents: string) => void;
  execFileSync: (cmd: string, args: string[], opts: { cwd: string; stdio: 'inherit' }) => void;
  log: (message: string) => void;
}

export async function installPlugins(options: InstallOptions, deps: InstallDependencies): Promise<void> {
  if (!deps.existsSync(options.configDir)) {
    deps.log(`[plugin-installer] No config directory at ${options.configDir}, nothing to install.`);
    return;
  }

  const config = deps.loadConfig(options.configDir, options.envConfigPrefix);
  const pluginsConfig = config.plugins as { plugins?: { package: string; version: string; isEnabled: boolean }[] } | undefined;

  if (!pluginsConfig) {
    deps.log(`[plugin-installer] No plugins.json in ${options.configDir}, nothing to install.`);
    return;
  }

  const plugins = (pluginsConfig.plugins || []).filter((p) => p.isEnabled);

  if (plugins.length === 0) {
    deps.log('[plugin-installer] No enabled plugins in plugins.json, nothing to install.');
    return;
  }

  deps.mkdirSync(options.installDir);
  deps.writeFileSync(
    path.join(options.installDir, 'package.json'),
    JSON.stringify({ name: 'installed-plugins', version: '0.0.0', private: true }, null, 2),
  );

  const specs = plugins.map((p) => `${p.package}@${p.version}`);
  deps.log(`[plugin-installer] Installing: ${specs.join(', ')}`);

  deps.execFileSync('npm', ['install', '--omit=dev', '--registry', options.registry, ...specs], {
    cwd: options.installDir,
    stdio: 'inherit',
  });

  deps.log('[plugin-installer] Done.');
}
