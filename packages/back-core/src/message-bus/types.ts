/** JSON object carried by a message. */
export type MessagePayload = Record<string, unknown>;
export type MessageBusLogLevel = 'info' | 'warn' | 'warning' | 'error';
export interface MessageBusLog {
  save(event: string, data?: any, level?: MessageBusLogLevel): void;
}

/** Identifier fields safe to log. Only scalar values; never message bodies, personal or free-form data. */
export type LogContext = Record<string, string | number | boolean>;
export type LogContextExtractor = (payload: MessagePayload) => LogContext;

export interface DestinationConfig {
  /** Provider-side name of the destination, e.g. a queue name. */
  address: string;
  /** Delay tiers: label -> delay in milliseconds. */
  delays?: Record<string, number>;
  /** Log-context extractor for messages published to / consumed from this destination. Overrides `MessageBusConfig.logContext`. */
  logContext?: LogContextExtractor;
}

/**
 * Message bus configuration.
 *
 * Contract: delivery is at-least-once, each message goes to one subscriber among replicas, there is no ordering
 * guarantee, and a publish resolves after the provider durably accepted the message.
 */
export interface MessageBusConfig {
  /** Provider name. Default 'rabbitmq'. */
  provider?: string;
  /** Provider-specific options (including any duplicate-suppression settings the provider offers), passed through unread by the core. */
  providerOptions?: Record<string, unknown>;
  /** Logical destination name -> destination. */
  destinations: Record<string, DestinationConfig>;
  getLog: () => MessageBusLog;
  /** When true, init() resolves at once and the connection is established in the background. Default false. */
  connectInBackground?: boolean;
  /** Delay between reconnect attempts. Default 10000. */
  reconnectDelayMs?: number;
  /** Upper bound for a serialized message. Combined with the provider's own limit (smaller wins). */
  maxPayloadBytes?: number;
  /** Retry a failed publish. Default { attempts: 0, delayMs: 0 }. */
  publishRetry?: { attempts: number; delayMs: number };
  /** Default log-context extractor (per-destination `logContext` wins). Default: none, i.e. logs carry only destination, messageId, length, durations. */
  logContext?: LogContextExtractor;
  /** Wraps every delivery. Default: runInAsyncLocalStorage from back-core. */
  runInContext?: (fn: () => Promise<void>) => void;
}

export interface PublishOptions {
  delayMs?: number;
  messageId?: string;
}
export interface PublishResult {
  messageId: string;
}
export interface MessageContext {
  destination: string;
  messageId?: string;
}

/**
 * Handler result: `true` = processed, `false` = deliver again later. A throw, a rejection or any non-boolean
 * result is a handler failure: the message is discarded and never redelivered.
 */
export type MessageHandler = (payload: MessagePayload, context: MessageContext) => boolean | Promise<boolean>;

/** What a failure hook receives. `error` is the thrown value, or an Error 'Handler returned <typeof result>' for an invalid result. */
export interface HandlerFailure {
  destination: string;
  messageId?: string;
  payload: MessagePayload;
  failure: 'threw' | 'invalid-result';
  error: unknown;
}
/** Reference to the stored failure record; logged as `errorId` for correlation. */
export interface FailureRecord {
  errorId?: string | number;
}
export type FailureHook = (failure: HandlerFailure) => FailureRecord | void | Promise<FailureRecord | void>;

export interface SubscribeOptions {
  /** Default 1. */
  concurrency?: number;
  /** Called once per handler failure, before the message is discarded. Records the failure (e.g. in a database) and returns a reference to it. */
  onFailure?: FailureHook;
}
export interface Subscription {
  readonly destination: string;
  cancel(): Promise<void>;
}
export type MessageBusStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'closed';
export interface MessageBusCounters {
  handled: number;
  redelivered: number;
  discarded: number;
  handlerErrors: number;
  parseErrors: number;
  publishErrors: number;
}
export interface MessageBusHealth {
  provider: string;
  status: MessageBusStatus;
  reconnects: number;
  inFlight: number;
  subscriptions: number;
  /** Totals since the bus was created. */
  counters: MessageBusCounters;
  /** ISO timestamp of the last handler failure, if any. */
  lastHandlerErrorAt?: string;
}
export interface CloseOptions {
  /** Default 0. */
  drainTimeoutMs?: number;
}
