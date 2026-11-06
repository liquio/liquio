import { BasePlugin, PluginContext } from "./base_provider";
import {
  EventExternalServiceProvider,
  ExternalServiceSendResult,
} from "./event_external_service_provider";

interface TestOptions {
  url: string;
}

class TestProvider extends EventExternalServiceProvider<TestOptions> {
  async send(data: unknown): Promise<ExternalServiceSendResult> {
    return { request: data, response: { ok: true }, isDone: true };
  }
}

describe("EventExternalServiceProvider", () => {
  const context: PluginContext = {
    log: {} as PluginContext["log"],
    pluginConfig: { key: "value" },
  };
  const options: TestOptions = { url: "https://example.com" };

  it("instantiates a concrete subclass with context and options", () => {
    const provider = new TestProvider(context, options);

    expect(provider).toBeInstanceOf(TestProvider);
  });

  it("resolves send() to the expected result", async () => {
    const provider = new TestProvider(context, options);

    await expect(provider.send("payload")).resolves.toEqual({
      request: "payload",
      response: { ok: true },
      isDone: true,
    });
  });

  it("is an instance of BasePlugin", () => {
    const provider = new TestProvider(context, options);

    expect(provider).toBeInstanceOf(BasePlugin);
  });
});
