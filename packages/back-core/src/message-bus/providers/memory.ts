import { MessageBusConfigError, MessageBusUnavailableError } from '../errors';
import {
  DeliveryHandler,
  MessageBusProvider,
  MessageBusProviderContext,
  ProviderCapabilities,
  ProviderConsumer,
  ProviderDelay,
  ProviderDestination,
  ProviderEvents,
} from '../provider';
import { MessagePayload } from '../types';

interface MemoryConsumer {
  address: string;
  maxInFlight: number;
  inFlight: number;
  handle: DeliveryHandler;
  cancelled: boolean;
  owner: MemoryMessageBusProvider;
}

/**
 * In-process queues. Pass one instance to several providers through `providerOptions.broker` to share them.
 */
export class MemoryBroker {
  public readonly queues = new Map<string, Buffer[]>();
  public readonly discardedQueues = new Map<string, Buffer[]>();
  public readonly consumers = new Map<string, MemoryConsumer[]>();
  private cursor = new Map<string, number>();

  queue(address: string): Buffer[] {
    let queue = this.queues.get(address);
    if (!queue) this.queues.set(address, (queue = []));
    return queue;
  }

  discardedList(address: string): Buffer[] {
    let list = this.discardedQueues.get(address);
    if (!list) this.discardedQueues.set(address, (list = []));
    return list;
  }

  /**
   * Deliver queued messages to the consumers of an address, round-robin, within their limits.
   * @param {string} address Destination address.
   */
  pump(address: string): void {
    const consumers = (this.consumers.get(address) || []).filter((consumer) => !consumer.cancelled);
    if (consumers.length === 0) return;
    const queue = this.queue(address);
    let progressed = true;
    while (queue.length > 0 && progressed) {
      progressed = false;
      for (let i = 0; i < consumers.length && queue.length > 0; i++) {
        const index = ((this.cursor.get(address) || 0) + i) % consumers.length;
        const consumer = consumers[index];
        if (consumer.inFlight >= consumer.maxInFlight || !consumer.owner.isConnected()) continue;
        this.cursor.set(address, index + 1);
        this.deliver(consumer, queue.shift() as Buffer);
        progressed = true;
        break;
      }
    }
  }

  private deliver(consumer: MemoryConsumer, body: Buffer): void {
    const generation = consumer.owner.generation;
    consumer.inFlight++;
    Promise.resolve()
      .then(() => consumer.handle(body))
      .catch(() => 'discard' as const)
      .then((outcome) => {
        consumer.inFlight--;
        if (consumer.owner.generation !== generation) {
          this.queue(consumer.address).unshift(body);
        } else if (outcome === 'redeliver') {
          this.queue(consumer.address).unshift(body);
        } else if (outcome === 'discard') {
          this.discardedList(consumer.address).push(body);
        }
        this.pump(consumer.address);
      });
  }
}

/**
 * Provider that keeps messages in process memory.
 */
export class MemoryMessageBusProvider implements MessageBusProvider {
  public readonly name = 'memory';
  public readonly capabilities: ProviderCapabilities;
  public generation = 0;
  private readonly broker: MemoryBroker;
  private events?: ProviderEvents;
  private connected = false;
  private closed = false;
  private nextSendError?: Error;
  private timers = new Set<NodeJS.Timeout>();

  constructor(options: Record<string, unknown> = {}) {
    this.broker = options.broker instanceof MemoryBroker ? options.broker : new MemoryBroker();
    this.capabilities = {
      arbitraryDelay: true,
      maxPayloadBytes: typeof options.maxPayloadBytes === 'number' ? options.maxPayloadBytes : undefined,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(events: ProviderEvents): Promise<void> {
    this.events = events;
    this.connected = true;
    events.onConnected();
  }

  async declare(destinations: ProviderDestination[]): Promise<void> {
    for (const destination of destinations) this.broker.queue(destination.address);
  }

  async send(destination: ProviderDestination, body: Buffer, options: { messageId: string; delay?: ProviderDelay }): Promise<void> {
    if (this.nextSendError) {
      const error = this.nextSendError;
      this.nextSendError = undefined;
      throw error;
    }
    if (!this.connected || this.closed) throw new MessageBusUnavailableError();
    const enqueue = (): void => {
      this.broker.queue(destination.address).push(body);
      this.broker.pump(destination.address);
    };
    if (options.delay && options.delay.delayMs > 0) {
      const timer = setTimeout((): void => {
        this.timers.delete(timer);
        enqueue();
      }, options.delay.delayMs);
      this.timers.add(timer);
    } else {
      enqueue();
    }
  }

  async consume(destination: ProviderDestination, options: { maxInFlight: number }, handle: DeliveryHandler): Promise<ProviderConsumer> {
    const consumer: MemoryConsumer = {
      address: destination.address,
      maxInFlight: options.maxInFlight,
      inFlight: 0,
      handle,
      cancelled: false,
      owner: this,
    };
    const list = this.broker.consumers.get(destination.address) || [];
    list.push(consumer);
    this.broker.consumers.set(destination.address, list);
    this.broker.pump(destination.address);
    return {
      cancel: async (): Promise<void> => {
        consumer.cancelled = true;
        const current = this.broker.consumers.get(destination.address) || [];
        this.broker.consumers.set(
          destination.address,
          current.filter((item) => item !== consumer),
        );
      },
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.connected = false;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  /**
   * Queued messages of an address, parsed.
   * @param {string} address Destination address.
   * @returns {object[]} Payloads.
   */
  messages(address: string): MessagePayload[] {
    return this.broker.queue(address).map((body) => JSON.parse(body.toString('utf8')));
  }

  /**
   * Discarded messages of an address, parsed.
   * @param {string} address Destination address.
   * @returns {object[]} Payloads.
   */
  discarded(address: string): MessagePayload[] {
    return this.broker.discardedList(address).map((body) => JSON.parse(body.toString('utf8')));
  }

  /**
   * Put a raw body into an address as if it was sent by someone else.
   * @param {string} address Destination address.
   * @param {Buffer|string} body Raw body.
   */
  injectRaw(address: string, body: Buffer | string): void {
    this.broker.queue(address).push(Buffer.isBuffer(body) ? body : Buffer.from(body));
    this.broker.pump(address);
  }

  simulateDisconnect(): void {
    this.connected = false;
    this.generation++;
    for (const list of this.broker.consumers.values()) {
      for (const consumer of list) if (consumer.owner === this) consumer.cancelled = true;
    }
    this.events?.onDisconnected(new Error('simulated disconnect'));
  }

  simulateReconnect(): void {
    this.connected = true;
    this.events?.onConnected();
  }

  failNextSend(error: Error): void {
    this.nextSendError = error;
  }
}

/**
 * Factory of the `memory` provider, for development and tests only; refuses to start in production.
 * @param {object} context Provider context.
 * @returns {MemoryMessageBusProvider} Provider.
 */
export function createMemoryProvider(context: MessageBusProviderContext): MessageBusProvider {
  if (process.env.NODE_ENV === 'production') {
    throw new MessageBusConfigError('The memory message bus provider is for development and tests only and cannot be used when NODE_ENV=production.');
  }
  return new MemoryMessageBusProvider(context.options);
}
