import * as path from "path";
import { Log } from "@liquio/back-core";
import {
  readPluginManifest,
  assertManifestCompatible,
} from "../manifest/plugin_manifest";
import { BasePlugin, PluginContext } from "../providers/base_provider";
import { PluginRegistry } from "./plugin_registry";
import { PluginsConfig, PluginConfigEntry } from "./types";
import { PluginLoadError } from "../errors/plugin_errors";

const SDK_VERSION = require("../../package.json").version as string;

export interface PluginLoadDependencies {
  requirePackageJson: (pkgDir: string) => Record<string, unknown>;
  requireModule: (
    pkgDir: string,
    main?: string,
  ) => new (context: PluginContext, options: unknown) => BasePlugin;
}

const defaultDeps: PluginLoadDependencies = {
  requirePackageJson: (pkgDir: string): Record<string, unknown> =>
    require(path.join(pkgDir, "package.json")),
  requireModule: (
    pkgDir: string,
    main?: string,
  ): new (context: PluginContext, options: unknown) => BasePlugin => {
    const entry = require(path.join(pkgDir, main ?? "dist/index.js"));
    return entry.default ?? entry;
  },
};

export class PluginLoader {
  constructor(
    private readonly log: Log,
    private readonly deps: PluginLoadDependencies = defaultDeps,
  ) {}

  async load(config: PluginsConfig): Promise<PluginRegistry> {
    const registry = new PluginRegistry();
    for (const entry of config.plugins) {
      if (!entry.isEnabled) continue;
      await this.loadOne(registry, config.pluginsDir, entry);
    }
    return registry;
  }

  private async loadOne(
    registry: PluginRegistry,
    pluginsDir: string,
    entry: PluginConfigEntry,
  ): Promise<void> {
    try {
      const pkgDir = path.join(pluginsDir, "node_modules", entry.package);
      const manifest = readPluginManifest(this.deps.requirePackageJson(pkgDir));
      assertManifestCompatible(manifest, SDK_VERSION);
      const PluginClass = this.deps.requireModule(pkgDir, manifest.main);
      const context: PluginContext = {
        log: this.log,
        pluginConfig: entry.options ?? {},
      };
      const instance = new PluginClass(context, entry.options ?? {});
      await instance.onInit();
      registry.register(entry.name, instance);
    } catch (err) {
      const loadError = new PluginLoadError(
        entry.name,
        entry.package,
        err as Error,
      );
      this.log.save(
        "plugin-load-error",
        { message: loadError.message, error: err },
        "error",
      );
    }
  }
}
