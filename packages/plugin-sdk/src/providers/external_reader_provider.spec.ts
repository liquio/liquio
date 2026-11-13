import { PluginContext } from "./base_provider";
import { ExternalReaderProvider } from "./external_reader_provider";

interface TestOptions {
  baseURL: string;
}

class TestProvider extends ExternalReaderProvider<TestOptions> {
  constructor(context: PluginContext, options: TestOptions) {
    super(context, options);
    this.registerMethod("ping", async () => ({ ok: true }));
  }
}

describe("ExternalReaderProvider", () => {
  const context: PluginContext = {
    log: {} as PluginContext["log"],
    pluginConfig: {},
  };
  const options: TestOptions = { baseURL: "https://example.test" };

  it("returns a registered method via getMethod()", () => {
    const provider = new TestProvider(context, options);

    expect(typeof provider.getMethod("ping")).toBe("function");
  });

  it("resolves the registered method's result", async () => {
    const provider = new TestProvider(context, options);
    const method = provider.getMethod("ping");

    await expect(method?.({})).resolves.toEqual({ ok: true });
  });

  it("returns undefined for an unregistered method", () => {
    const provider = new TestProvider(context, options);

    expect(provider.getMethod("missing")).toBeUndefined();
  });

  it("lists all registered method names via listMethods()", () => {
    const provider = new TestProvider(context, options);

    expect(provider.listMethods()).toEqual(["ping"]);
  });
});
