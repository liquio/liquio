import { PluginLogger } from "../logger";

/**
 * A payment transaction record a `TaskPaymentProvider` binds a short opaque id to, instead of
 * embedding the raw fields (documentId, paymentControlPath, ...) in a redirect URL - some payment
 * processors (hosted-checkout redirects in particular) impose a length limit on the return URL a
 * merchant may submit, and documentId + paymentControlPath + taskId can push that limit.
 */
export interface TaskPaymentTransactionRecord {
  documentId: string;
  paymentControlPath: string;
  taskId?: string;
  workflowId?: string;
  extraData?: Record<string, unknown>;
}

/**
 * Host-provided service a `TaskPaymentProvider` calls to persist/resolve a
 * {@link TaskPaymentTransactionRecord}, instead of accessing the host's database directly -
 * providers run as isolated plugins (see {@link PluginContext}) and must never depend on a
 * host component's internal persistence layer.
 */
export interface TaskPaymentTransactionService {
  /** Persist a transaction record and return the short opaque id to embed in a redirect URL. */
  create(data: TaskPaymentTransactionRecord): Promise<string>;
  /** Resolve a previously created transaction id back to its record, or undefined if not found. */
  resolve(id: string): Promise<TaskPaymentTransactionRecord | undefined>;
}

export interface PluginContext {
  log: PluginLogger;
  pluginConfig: Record<string, unknown>;
  /**
   * Only populated by hosts that load `TaskPaymentProvider` plugins (see
   * `PluginLoader`'s `contextExtensions`); other plugin kinds (event/external-reader providers)
   * never receive this.
   */
  paymentTransactions?: TaskPaymentTransactionService;
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
