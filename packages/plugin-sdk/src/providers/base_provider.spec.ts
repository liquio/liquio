import { BasePlugin, PluginContext } from "./base_provider";

interface TestOptions {
  foo: string;
}

class TestPlugin extends BasePlugin<TestOptions> {
  get exposedContext(): PluginContext {
    return this.context;
  }

  get exposedOptions(): TestOptions {
    return this.options;
  }
}

describe("BasePlugin", () => {
  const context: PluginContext = {
    log: {} as PluginContext["log"],
    pluginConfig: { key: "value" },
  };
  const options: TestOptions = { foo: "bar" };

  it("stores context and options accessibly", () => {
    const plugin = new TestPlugin(context, options);

    expect(plugin.exposedContext).toBe(context);
    expect(plugin.exposedOptions).toBe(options);
  });

  it("resolves onInit() to undefined by default", async () => {
    const plugin = new TestPlugin(context, options);

    await expect(plugin.onInit()).resolves.toBeUndefined();
  });

  it("resolves onDestroy() to undefined by default", async () => {
    const plugin = new TestPlugin(context, options);

    await expect(plugin.onDestroy()).resolves.toBeUndefined();
  });
});
