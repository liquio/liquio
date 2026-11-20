import { Injectable } from '@nestjs/common';

import { LoggerService } from '@components/observability/logger.service';

export type ProviderMethod = (args: ProviderMethodArgs) => Promise<unknown>;

export interface ProviderMethodArgs {
  /**
   * Caller-asserted user identity (ipn, edrpou, userUnits, userServices).
   * External-reader has no user authentication of its own: this value is built by the task service from the
   * authenticated user and trusted as-is, so anyone holding the external-reader Basic token can send any value.
   * Do NOT use it as the only authorization for cross-user data in a provider.
   */
  userFilter?: {
    ipn?: string;
    edrpou?: string | null;
    userUnits?: { head: string[]; member: string[] };
    userServices?: unknown[];
  };
  nonUserFilter?: unknown;
  extraParams?: { [key: string]: unknown };
}

@Injectable()
export class BaseProvider<TOptions = Record<string, unknown>> {
  protected readonly options: TOptions;
  protected readonly methods: Map<string, ProviderMethod> = new Map();

  constructor(
    protected readonly logger: LoggerService,
    options?: TOptions,
  ) {
    this.options = options || ({} as TOptions);
  }

  protected registerMethod(name: string, method: ProviderMethod) {
    this.logger.log('base-provider|method-registered', {
      method: name,
      provider: this.constructor.name,
    });
    this.methods.set(name, method);
  }

  getMethod(name: string): ProviderMethod | undefined {
    return this.methods.get(name);
  }
}
