import { Log } from "@liquio/back-core";

export interface PluginContext {
  log: Log;
  pluginConfig: Record<string, unknown>;
}

export abstract class BasePlugin<TOptions = Record<string, unknown>> {
  protected readonly options: TOptions;
  protected readonly context: PluginContext;

  constructor(context: PluginContext, options: TOptions) {
    this.context = context;
    this.options = options;
  }

  async onInit(): Promise<void> {}

  async onDestroy(): Promise<void> {}
}
