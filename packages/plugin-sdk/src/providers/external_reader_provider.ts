import { BasePlugin } from "./base_provider";

export type ProviderMethod = (args: ProviderMethodArgs) => Promise<unknown>;

export interface ProviderMethodArgs {
  /**
   * Caller-asserted user identity, built by the task service from the authenticated user and trusted as-is:
   * external-reader has no user authentication of its own. Do NOT use it as the only authorization for cross-user data.
   */
  userFilter?: Record<string, unknown>;
  nonUserFilter?: unknown;
  extraParams?: Record<string, unknown>;
}

export abstract class ExternalReaderProvider<
  TOptions = Record<string, unknown>,
> extends BasePlugin<TOptions> {
  private readonly methods = new Map<string, ProviderMethod>();

  protected registerMethod(name: string, method: ProviderMethod): void {
    this.methods.set(name, method);
  }

  getMethod(name: string): ProviderMethod | undefined {
    return this.methods.get(name);
  }

  listMethods(): string[] {
    return [...this.methods.keys()];
  }
}
