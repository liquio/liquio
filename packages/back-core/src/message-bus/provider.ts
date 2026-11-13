import { MessageBusLog } from './types';

export type SettleOutcome = 'done' | 'redeliver' | 'discard';
/** The core's per-delivery callback. Never rejects: it always resolves to the outcome the provider must apply. */
export type DeliveryHandler = (body: Buffer) => Promise<SettleOutcome>;
export interface ProviderDelay {
  delayMs: number;
  label?: string;
}
export interface ProviderDestination {
  name: string;
  address: string;
  /** Ascending by delayMs. */
  delays: Array<{ label: string; delayMs: number }>;
}
export interface ProviderCapabilities {
  maxPayloadBytes?: number;
  arbitraryDelay: boolean;
}
export interface ProviderEvents {
  onConnected(): void;
  onDisconnected(error?: Error): void;
}
export interface ProviderConsumer {
  cancel(): Promise<void>;
}
export interface MessageBusProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  /** Resolve after the first successful connection; keep reconnecting after drops until close(). Never reject because the server is unreachable. */
  connect(events: ProviderEvents): Promise<void>;
  /** Idempotent. Called after every (re)connect. */
  declare(destinations: ProviderDestination[]): Promise<void>;
  /** Resolve only after durable acceptance. Reject with MessageBusUnavailableError when not connected. */
  send(destination: ProviderDestination, body: Buffer, options: { messageId: string; delay?: ProviderDelay }): Promise<void>;
  /**
   * Must never have more than maxInFlight unsettled deliveries for this consumer. For each delivery the provider
   * awaits handle(body) and applies the returned outcome itself. A provider may decide not to call handle at all
   * (e.g. its own duplicate suppression) and settle the delivery directly.
   */
  consume(destination: ProviderDestination, options: { maxInFlight: number }, handle: DeliveryHandler): Promise<ProviderConsumer>;
  close(): Promise<void>;
}
export interface MessageBusProviderContext {
  options: Record<string, unknown>;
  getLog: () => MessageBusLog;
  reconnectDelayMs: number;
}
export type MessageBusProviderFactory = (context: MessageBusProviderContext) => MessageBusProvider;
