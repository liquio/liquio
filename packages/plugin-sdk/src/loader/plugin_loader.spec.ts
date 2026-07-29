import { BasePlugin, PluginContext } from "../providers/base_provider";
import { PluginsConfig } from "./types";
import { PluginLoader, PluginLoadDependencies } from "./plugin_loader";

const SDK_VERSION: string = require("../../package.json").version;

class WorkingPlugin extends BasePlugin {
  async onInit(): Promise<void> {
    // no-op
  }
}

class ThrowingConstructorPlugin extends BasePlugin {
  constructor(context: PluginContext, options: Record<string, unknown>) {
    super(context, options);
    throw new Error("boom during construction");
  }
}

function validManifestFor(packageName: string): Record<string, unknown> {
  return {
    name: packageName,
    main: "dist/index.js",
    liquioPlugin: {
      kind: "event-external-service",
      sdkVersion: SDK_VERSION,
    },
  };
}

function makeConfig(
  overrides: Partial<PluginsConfig["plugins"][number]> = {},
): PluginsConfig {
  return {
    pluginsDir: "/fake/plugins",
    plugins: [
      {
        package: "some-plugin-package",
        version: "1.0.0",
        isEnabled: true,
        name: "some-plugin",
        ...overrides,
      },
    ],
  };
}

function makeLog(): { save: jest.Mock } {
  return { save: jest.fn() };
}

describe("PluginLoader", () => {
  it("loads a well-formed, enabled plugin entry and registers it under entry.name", async () => {
    const deps: PluginLoadDependencies = {
      requirePackageJson: jest
        .fn()
        .mockReturnValue(validManifestFor("some-plugin-package")),
      requireModule: jest.fn().mockReturnValue(WorkingPlugin),
    };
    const log = makeLog();
    const loader = new PluginLoader(log as any, deps);

    const registry = await loader.load(makeConfig());

    expect(registry.has("some-plugin")).toBe(true);
    expect(registry.get("some-plugin")).toBeInstanceOf(WorkingPlugin);
    expect(log.save).not.toHaveBeenCalled();
  });

  it("skips a disabled entry without calling requirePackageJson", async () => {
    const deps: PluginLoadDependencies = {
      requirePackageJson: jest.fn(),
      requireModule: jest.fn(),
    };
    const log = makeLog();
    const loader = new PluginLoader(log as any, deps);

    const registry = await loader.load(makeConfig({ isEnabled: false }));

    expect(deps.requirePackageJson).not.toHaveBeenCalled();
    expect(deps.requireModule).not.toHaveBeenCalled();
    expect(registry.has("some-plugin")).toBe(false);
    expect(log.save).not.toHaveBeenCalled();
  });

  it("degrades gracefully when the manifest is missing/invalid", async () => {
    const deps: PluginLoadDependencies = {
      requirePackageJson: jest.fn().mockReturnValue({
        // Missing required "liquioPlugin" block.
        name: "some-plugin-package",
      }),
      requireModule: jest.fn().mockReturnValue(WorkingPlugin),
    };
    const log = makeLog();
    const loader = new PluginLoader(log as any, deps);

    const registry = await loader.load(makeConfig());

    expect(registry.has("some-plugin")).toBe(false);
    expect(log.save).toHaveBeenCalledTimes(1);
  });

  it("degrades gracefully when the plugin constructor throws", async () => {
    const deps: PluginLoadDependencies = {
      requirePackageJson: jest
        .fn()
        .mockReturnValue(validManifestFor("some-plugin-package")),
      requireModule: jest.fn().mockReturnValue(ThrowingConstructorPlugin),
    };
    const log = makeLog();
    const loader = new PluginLoader(log as any, deps);

    const registry = await loader.load(makeConfig());

    expect(registry.has("some-plugin")).toBe(false);
    expect(log.save).toHaveBeenCalledTimes(1);
  });

  it("loads the fine entry and skips the broken one when both are present", async () => {
    const deps: PluginLoadDependencies = {
      requirePackageJson: jest.fn((pkgDir: string) => {
        if (pkgDir.includes("broken-package")) {
          return { name: "broken-package" }; // Invalid: no liquioPlugin block.
        }
        return validManifestFor("fine-package");
      }),
      requireModule: jest.fn().mockReturnValue(WorkingPlugin),
    };
    const log = makeLog();
    const loader = new PluginLoader(log as any, deps);

    const config: PluginsConfig = {
      pluginsDir: "/fake/plugins",
      plugins: [
        {
          package: "broken-package",
          version: "1.0.0",
          isEnabled: true,
          name: "broken-plugin",
        },
        {
          package: "fine-package",
          version: "1.0.0",
          isEnabled: true,
          name: "fine-plugin",
        },
      ],
    };

    const registry = await loader.load(config);

    expect(registry.has("broken-plugin")).toBe(false);
    expect(registry.has("fine-plugin")).toBe(true);
    expect(registry.get("fine-plugin")).toBeInstanceOf(WorkingPlugin);
    expect(log.save).toHaveBeenCalledTimes(1);
  });
});
