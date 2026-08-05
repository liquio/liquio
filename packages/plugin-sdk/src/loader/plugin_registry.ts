import { BasePlugin } from "../providers/base_provider";

export class PluginRegistry {
  private readonly instances = new Map<string, BasePlugin>();

  register(name: string, instance: BasePlugin): void {
    if (this.instances.has(name)) {
      throw new Error(`Plugin instance "${name}" is already registered`);
    }
    this.instances.set(name, instance);
  }

  get<T extends BasePlugin>(name: string): T | undefined {
    return this.instances.get(name) as T | undefined;
  }

  has(name: string): boolean {
    return this.instances.has(name);
  }

  all(): Map<string, BasePlugin> {
    return this.instances;
  }
}
