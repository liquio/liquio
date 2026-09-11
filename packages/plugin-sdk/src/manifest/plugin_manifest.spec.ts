import {
  assertManifestCompatible,
  readPluginManifest,
} from "./plugin_manifest";

describe("readPluginManifest", () => {
  it("returns a valid manifest for well-formed input", () => {
    const packageJson = {
      name: "my-plugin",
      main: "dist/index.js",
      liquioPlugin: {
        kind: "event-external-service",
        sdkVersion: "^0.1.0",
      },
    };

    const manifest = readPluginManifest(packageJson);

    expect(manifest).toEqual({
      name: "my-plugin",
      kind: "event-external-service",
      sdkVersion: "^0.1.0",
      main: "dist/index.js",
    });
  });

  it('throws when "name" is missing', () => {
    const packageJson = {
      liquioPlugin: {
        kind: "event-external-service",
        sdkVersion: "^0.1.0",
      },
    };

    expect(() => readPluginManifest(packageJson)).toThrow(
      'Invalid plugin package.json: missing "name"',
    );
  });

  it('throws when "liquioPlugin" is missing', () => {
    const packageJson = {
      name: "my-plugin",
    };

    expect(() => readPluginManifest(packageJson)).toThrow(
      'Invalid plugin package.json for "my-plugin": missing "liquioPlugin" block',
    );
  });

  it('throws when "kind" is not one of the two valid values', () => {
    const packageJson = {
      name: "my-plugin",
      liquioPlugin: {
        kind: "not-a-real-kind",
        sdkVersion: "^0.1.0",
      },
    };

    expect(() => readPluginManifest(packageJson)).toThrow(
      'Invalid plugin package.json for "my-plugin": liquioPlugin.kind must be one of event-external-service, external-reader-provider',
    );
  });

  it('throws when "sdkVersion" is missing', () => {
    const packageJson = {
      name: "my-plugin",
      liquioPlugin: {
        kind: "external-reader-provider",
      },
    };

    expect(() => readPluginManifest(packageJson)).toThrow(
      'Invalid plugin package.json for "my-plugin": liquioPlugin.sdkVersion must be a string',
    );
  });
});

describe("assertManifestCompatible", () => {
  it("does not throw when major versions match", () => {
    const manifest = {
      name: "my-plugin",
      kind: "event-external-service" as const,
      sdkVersion: "^0.1.0",
    };

    expect(() => assertManifestCompatible(manifest, "0.1.0")).not.toThrow();
  });

  it("throws when major versions differ", () => {
    const manifest = {
      name: "my-plugin",
      kind: "event-external-service" as const,
      sdkVersion: "^1.0.0",
    };

    expect(() => assertManifestCompatible(manifest, "0.1.0")).toThrow(
      'Plugin "my-plugin" requires @liquio/plugin-sdk ^1.0.0, host runs 0.1.0',
    );
  });
});
