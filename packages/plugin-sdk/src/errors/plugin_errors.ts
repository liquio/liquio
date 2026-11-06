export class PluginValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginValidationError";
  }
}

export class PluginLoadError extends Error {
  readonly pluginName: string;
  readonly packageName: string;
  readonly cause?: Error;

  constructor(pluginName: string, packageName: string, cause?: Error) {
    super(
      `Failed to load plugin "${pluginName}" (${packageName}): ${cause?.message ?? "unknown error"}`,
    );
    this.name = "PluginLoadError";
    this.pluginName = pluginName;
    this.packageName = packageName;
    this.cause = cause;
  }
}

export class UnknownProviderTypeError extends Error {
  constructor(providerType: string, serviceKey: string) {
    super(
      `Unknown provider type: "${providerType}" for external service "${serviceKey}"`,
    );
    this.name = "UnknownProviderTypeError";
  }
}
