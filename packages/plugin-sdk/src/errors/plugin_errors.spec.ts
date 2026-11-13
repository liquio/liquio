import {
  PluginLoadError,
  PluginValidationError,
  UnknownProviderTypeError,
} from "./plugin_errors";

describe("PluginValidationError", () => {
  it("extends Error and sets the correct name", () => {
    const error = new PluginValidationError("invalid manifest");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PluginValidationError");
    expect(error.message).toBe("invalid manifest");
  });
});

describe("PluginLoadError", () => {
  it("extends Error and sets the correct name", () => {
    const error = new PluginLoadError("my-plugin", "my-plugin-package");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PluginLoadError");
  });

  it("includes the plugin name, package name, and cause message in .message", () => {
    const cause = new Error("module not found");
    const error = new PluginLoadError("my-plugin", "my-plugin-package", cause);

    expect(error.message).toContain("my-plugin");
    expect(error.message).toContain("my-plugin-package");
    expect(error.message).toContain("module not found");
  });

  it("falls back to 'unknown error' when no cause is provided", () => {
    const error = new PluginLoadError("my-plugin", "my-plugin-package");

    expect(error.message).toContain("unknown error");
  });

  it("stores the original cause", () => {
    const cause = new Error("module not found");
    const error = new PluginLoadError("my-plugin", "my-plugin-package", cause);

    expect(error.cause).toBe(cause);
  });
});

describe("UnknownProviderTypeError", () => {
  it("extends Error and sets the correct name", () => {
    const error = new UnknownProviderTypeError("rest", "billing");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("UnknownProviderTypeError");
  });

  it("includes both the provider type and service key in .message", () => {
    const error = new UnknownProviderTypeError("rest", "billing");

    expect(error.message).toContain("rest");
    expect(error.message).toContain("billing");
  });
});
