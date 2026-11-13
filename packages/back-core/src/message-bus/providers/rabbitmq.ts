import amqp, { Channel, ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import _ from 'lodash';

import { MessageBusConfigError, MessageBusPublishError, MessageBusUnavailableError } from '../errors';
import { errorRef } from '../log_context';
import {
  DeliveryHandler,
  MessageBusProvider,
  MessageBusProviderContext,
  ProviderCapabilities,
  ProviderConsumer,
  ProviderDelay,
  ProviderDestination,
  ProviderEvents,
  SettleOutcome,
} from '../provider';
import { RabbitMqDedup, RabbitMqDedupOptions } from './rabbitmq_dedup';

export { RabbitMqDedupOptions, RabbitMqDedupStore } from './rabbitmq_dedup';

const DEFAULT_MAX_MESSAGE_BYTES = 134217728;

export interface RabbitMqProviderOptions {
  /** Connection URL. Required. Contains credentials: never logged. */
  amqpConnection: string;
  /** Appended to the URL as a query string. */
  amqpConnectionParams?: Record<string, string | number | boolean>;
  /** Per physical queue name, merged over the default declare options. */
  queueParams?: Array<{ queueName: string; params?: object }>;
  /** Default 134217728. */
  maxMessageBytes?: number;
  dedup?: RabbitMqDedupOptions;
}

interface Waiter {
  timer: NodeJS.Timeout;
  resolve: () => void;
}

/**
 * RabbitMQ provider: persistent JSON messages, confirm channel for publishing, TTL/dead-letter queues for delays.
 */
export class RabbitMqMessageBusProvider implements MessageBusProvider {
  public readonly name = 'rabbitmq';
  public readonly capabilities: ProviderCapabilities;
  public generation = 0;

  private readonly options: RabbitMqProviderOptions;
  private readonly dedup: RabbitMqDedup;
  private events?: ProviderEvents;
  private connection?: ChannelModel;
  private confirmChannel?: ConfirmChannel;
  private connected = false;
  private closing = false;
  private disconnectedGeneration = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private readonly sleepers = new Set<Waiter>();
  private readonly closedChannels = new WeakSet<object>();
  private readonly cancelledChannels = new WeakSet<object>();
  private readonly pendingConfirms = new Set<(error: Error) => void>();

  /**
   * @param {object} context Provider context.
   */
  constructor(private readonly context: MessageBusProviderContext) {
    this.options = (context.options || {}) as unknown as RabbitMqProviderOptions;
    this.capabilities = { arbitraryDelay: false, maxPayloadBytes: this.options.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES };
    this.dedup = new RabbitMqDedup(this.options.dedup, context.getLog);
  }

  async connect(events: ProviderEvents): Promise<void> {
    if (!this.options.amqpConnection) throw new MessageBusConfigError('rabbitmq provider: amqpConnection is required');
    this.events = events;
    this.dedup.init();
    if (await this.establish()) events.onConnected();
  }

  async declare(destinations: ProviderDestination[]): Promise<void> {
    const channel = this.requireChannel();
    for (const destination of destinations) {
      const { address } = destination;
      await channel.assertQueue(address, this.queueParams(address, { durable: true }));
      for (const { label, delayMs } of destination.delays) {
        const name = `${address}-${label}`;
        await channel.assertQueue(
          name,
          this.queueParams(name, {
            durable: true,
            arguments: { 'x-dead-letter-exchange': '', 'x-message-ttl': delayMs, 'x-dead-letter-routing-key': address },
          }),
        );
      }
    }
  }

  async send(destination: ProviderDestination, body: Buffer, options: { messageId: string; delay?: ProviderDelay }): Promise<void> {
    const channel = this.confirmChannel;
    if (!channel || !this.connected || this.closedChannels.has(channel)) throw new MessageBusUnavailableError();
    const { delay } = options;
    if (delay && !delay.label) throw new MessageBusConfigError('rabbitmq provider: a delay requires a tier label');
    const target = delay ? `${destination.address}-${delay.label}` : destination.address;
    await new Promise<void>((resolve, reject) => {
      const fail = (error: Error): void => {
        this.pendingConfirms.delete(fail);
        reject(error);
      };
      this.pendingConfirms.add(fail);
      try {
        channel.sendToQueue(target, body, { persistent: true, messageId: options.messageId, contentType: 'application/json' }, (error) => {
          if (!this.pendingConfirms.delete(fail)) return;
          if (error) reject(new MessageBusPublishError('rabbitmq provider: message was not accepted', errorRef(error)));
          else resolve();
        });
      } catch (error) {
        this.pendingConfirms.delete(fail);
        reject(new MessageBusPublishError('rabbitmq provider: publish failed', errorRef(error)));
      }
    });
  }

  async consume(destination: ProviderDestination, options: { maxInFlight: number }, handle: DeliveryHandler): Promise<ProviderConsumer> {
    const connection = this.connection;
    if (!connection || !this.connected) throw new MessageBusUnavailableError();
    const generation = this.generation;
    const { address } = destination;
    const channel = await connection.createChannel();
    this.watch(channel, generation);
    await channel.prefetch(options.maxInFlight);
    const { consumerTag } = await channel.consume(
      address,
      (msg) => {
        if (!msg) {
          this.handleClose(generation, new Error('consumer cancelled'));
          return;
        }
        void this.deliver(channel, generation, address, msg, handle);
      },
      { noAck: false },
    );
    return {
      cancel: async (): Promise<void> => {
        this.cancelledChannels.add(channel);
        try {
          if (!this.closedChannels.has(channel)) await channel.cancel(consumerTag);
        } catch {
          // The channel is already closed.
        }
        try {
          if (!this.closedChannels.has(channel)) await channel.close();
        } catch {
          // The channel is already closed.
        }
      },
    };
  }

  async close(): Promise<void> {
    this.closing = true;
    this.connected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    for (const sleeper of this.sleepers) {
      clearTimeout(sleeper.timer);
      sleeper.resolve();
    }
    this.sleepers.clear();
    this.failPendingConfirms();
    await this.dedup.close();
    const connection = this.connection;
    this.connection = undefined;
    this.confirmChannel = undefined;
    if (!connection) return;
    try {
      await connection.close();
    } catch (error) {
      this.log('message-bus-connection-error', { provider: this.name, error: errorRef(error) }, 'warn');
    }
  }

  private async deliver(channel: Channel, generation: number, address: string, msg: ConsumeMessage, handle: DeliveryHandler): Promise<void> {
    let outcome: SettleOutcome;
    try {
      outcome = await this.dedup.run(msg.content, address, () => handle(msg.content));
    } catch (error) {
      this.log('message-bus-handler-error', { provider: this.name, destination: address, error: errorRef(error) }, 'error');
      outcome = 'discard';
    }
    if (generation !== this.generation || this.closedChannels.has(channel)) {
      this.log('message-bus-settle-error', { provider: this.name, reason: 'stale' }, 'warn');
      return;
    }
    try {
      if (outcome === 'done') channel.ack(msg);
      else if (outcome === 'redeliver') channel.nack(msg, false, true);
      else channel.nack(msg, false, false);
    } catch (error) {
      this.log('message-bus-settle-error', { provider: this.name, error: errorRef(error) }, 'warn');
    }
  }

  private url(): string {
    const base = this.options.amqpConnection;
    const params = this.options.amqpConnectionParams;
    if (!params || Object.keys(params).length === 0) return base;
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
  }

  private queueParams(queueName: string, defaults: object): object {
    const result = _.cloneDeep(defaults);
    for (const entry of this.options.queueParams || []) {
      if (entry && entry.queueName === queueName && entry.params) _.merge(result, _.cloneDeep(entry.params));
    }
    return result;
  }

  private requireChannel(): ConfirmChannel {
    if (!this.confirmChannel || !this.connected) throw new MessageBusUnavailableError();
    return this.confirmChannel;
  }

  /**
   * Connect, retrying until success or close().
   * @returns {Promise<boolean>} True when connected.
   */
  private async establish(): Promise<boolean> {
    while (!this.closing) {
      let connection: ChannelModel | undefined;
      try {
        connection = await amqp.connect(this.url());
        if (this.closing) {
          await connection.close().catch(() => undefined);
          return false;
        }
        const generation = this.generation + 1;
        const confirmChannel = await connection.createConfirmChannel();
        this.generation = generation;
        this.connection = connection;
        this.confirmChannel = confirmChannel;
        this.connected = true;
        this.watch(connection, generation);
        this.watch(confirmChannel, generation);
        return true;
      } catch (error) {
        if (connection) await connection.close().catch(() => undefined);
        this.log('message-bus-connection-error', { provider: this.name, error: errorRef(error) }, 'error');
        await this.sleep(this.context.reconnectDelayMs);
      }
    }
    return false;
  }

  private watch(target: ChannelModel | Channel, generation: number): void {
    target.on('error', (error: Error) => {
      this.log('message-bus-connection-error', { provider: this.name, error: errorRef(error) }, 'error');
    });
    target.on('close', (error?: Error) => {
      this.closedChannels.add(target);
      if (this.cancelledChannels.has(target)) return;
      this.handleClose(generation, error);
    });
  }

  private handleClose(generation: number, error?: Error): void {
    if (this.closing || generation !== this.generation || this.disconnectedGeneration === generation) return;
    this.disconnectedGeneration = generation;
    this.connected = false;
    this.failPendingConfirms();
    this.events?.onDisconnected(error);
    const connection = this.connection;
    if (connection) {
      connection.close().catch(() => undefined);
    }
    if (this.reconnectTimer) return;
    const delayMs = this.context.reconnectDelayMs;
    this.log('message-bus-reconnecting', { provider: this.name, delayMs }, 'info');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.reconnect();
    }, delayMs);
  }

  private async reconnect(): Promise<void> {
    if (this.closing) return;
    if (await this.establish()) this.events?.onConnected();
  }

  private failPendingConfirms(): void {
    const pending = [...this.pendingConfirms];
    this.pendingConfirms.clear();
    for (const fail of pending) fail(new MessageBusUnavailableError());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const sleeper: Waiter = {
        timer: setTimeout(() => {
          this.sleepers.delete(sleeper);
          resolve();
        }, ms),
        resolve,
      };
      this.sleepers.add(sleeper);
    });
  }

  private log(event: string, data: Record<string, unknown>, level: 'info' | 'warn' | 'error'): void {
    try {
      this.context.getLog().save(event, data, level);
    } catch {
      // Logging must not break the provider.
    }
  }
}
