import * as path from "path";

export interface InstallOptions {
  configPath: string;
  installDir: string;
  registry: string;
}

export interface InstallDependencies {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string) => string;
  mkdirSync: (p: string) => void;
  writeFileSync: (p: string, contents: string) => void;
  execFileSync: (
    cmd: string,
    args: string[],
    opts: { cwd: string; stdio: "inherit" },
  ) => void;
  log: (message: string) => void;
}

export async function installPlugins(
  options: InstallOptions,
  deps: InstallDependencies,
): Promise<void> {
  if (!deps.existsSync(options.configPath)) {
    deps.log(
      `[plugin-installer] No plugins.json at ${options.configPath}, nothing to install.`,
    );
    return;
  }

  const config = JSON.parse(deps.readFileSync(options.configPath));
  const plugins = (config.plugins || []).filter(
    (p: { isEnabled: boolean }) => p.isEnabled,
  );

  if (plugins.length === 0) {
    deps.log(
      "[plugin-installer] No enabled plugins in plugins.json, nothing to install.",
    );
    return;
  }

  deps.mkdirSync(options.installDir);
  deps.writeFileSync(
    path.join(options.installDir, "package.json"),
    JSON.stringify(
      { name: "installed-plugins", version: "0.0.0", private: true },
      null,
      2,
    ),
  );

  const specs = plugins.map(
    (p: { package: string; version: string }) => `${p.package}@${p.version}`,
  );
  deps.log(`[plugin-installer] Installing: ${specs.join(", ")}`);

  deps.execFileSync(
    "npm",
    ["install", "--omit=dev", "--registry", options.registry, ...specs],
    {
      cwd: options.installDir,
      stdio: "inherit",
    },
  );

  deps.log("[plugin-installer] Done.");
}
