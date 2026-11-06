import { BasePlugin, PluginContext } from "../providers/base_provider";
import { PluginRegistry } from "./plugin_registry";

class TestPlugin extends BasePlugin {}

describe("PluginRegistry", () => {
  const context: PluginContext = {
    log: {} as PluginContext["log"],
    pluginConfig: { key: "value" },
  };
  const options: Record<string, unknown> = { foo: "bar" };

  it("returns the same instance that was registered", () => {
    const registry = new PluginRegistry();
    const plugin = new TestPlugin(context, options);

    registry.register("plugin-a", plugin);

    expect(registry.get("plugin-a")).toBe(plugin);
  });

  it("returns undefined for an unregistered name", () => {
    const registry = new PluginRegistry();

    expect(registry.get("missing")).toBeUndefined();
  });

  it("reports has() as true/false correctly", () => {
    const registry = new PluginRegistry();
    const plugin = new TestPlugin(context, options);

    expect(registry.has("plugin-a")).toBe(false);

    registry.register("plugin-a", plugin);

    expect(registry.has("plugin-a")).toBe(true);
  });

  it("throws when registering a name that's already registered", () => {
    const registry = new PluginRegistry();
    const plugin = new TestPlugin(context, options);

    registry.register("plugin-a", plugin);

    expect(() =>
      registry.register("plugin-a", new TestPlugin(context, options)),
    ).toThrow('Plugin instance "plugin-a" is already registered');
  });

  it("returns a Map containing every registered instance via all()", () => {
    const registry = new PluginRegistry();
    const pluginA = new TestPlugin(context, options);
    const pluginB = new TestPlugin(context, options);

    registry.register("plugin-a", pluginA);
    registry.register("plugin-b", pluginB);

    const all = registry.all();

    expect(all).toBeInstanceOf(Map);
    expect(all.size).toBe(2);
    expect(all.get("plugin-a")).toBe(pluginA);
    expect(all.get("plugin-b")).toBe(pluginB);
  });
});
