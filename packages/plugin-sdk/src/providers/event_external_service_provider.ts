import { BasePlugin } from "./base_provider";

export interface ExternalServiceSendResult {
  request: unknown;
  response: unknown;
  isDone: boolean;
}

export interface ExternalServiceSendContext {
  filestorage?: unknown;
  documentModel?: unknown;
  taskModel?: unknown;
  workflowId?: string;
}

export abstract class EventExternalServiceProvider<
  TOptions = Record<string, unknown>,
> extends BasePlugin<TOptions> {
  abstract send(
    data: unknown,
    isTest?: boolean,
    ctx?: ExternalServiceSendContext,
  ): Promise<ExternalServiceSendResult>;
}
