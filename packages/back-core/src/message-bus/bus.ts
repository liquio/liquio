import { randomUUID } from 'node:crypto';

import { runInAsyncLocalStorage } from '../common/async_local_storage';
import { DEFAULT_PROVIDER, DEFAULT_RECONNECT_DELAY_MS, DESTINATION_NAME_PATTERN, MESSAGE_ID_FIELD } from './constants';
import { MessageBusConfigError, MessageBusError, MessageBusPublishError, MessageBusUnavailableError, MessageTooLargeError } from './errors';
import { errorRef, sanitizeLogContext } from './log_context';
import { MessageBusProvider, ProviderConsumer, ProviderDelay, ProviderDestination, SettleOutcome } from './provider';
import { getMessageBusProviderFactory } from './registry';
import {
  CloseOptions,
  LogContext,
  MessageBusConfig,
  MessageBusCounters,
  MessageBusHealth,
  MessageBusLog,
  MessageBusLogLevel,
  MessageBusStatus,
  MessageHandler,
  MessagePayload,
  PublishOptions,
  PublishResult,
  SubscribeOptions,
  Subscription,
} from './types';

interface ActiveSubscription {
  destination: string;
  handler: MessageHandler;
  concurrency: number;
  onFailure?: SubscribeOptions['onFailure'];
  consumer?: ProviderConsumer;
}

const wait = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isPlainObject = (value: unknown): value is MessagePayload => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Provider-agnostic message bus.
 *
 * Delivery is at-least-once, each message goes to one subscriber among replicas, there is no ordering guarantee,
 * and a publish resolves after the provider durably accepted the message. A handler returns `true` when the message
 * is processed and `false` to have it delivered again later. A throw, a rejection or any non-boolean result is a
 * handler failure: the message is discarded and never redelivered.
 */
export class MessageBus {
  private readonly config: MessageBusConfig;
  private readonly destinations = new Map<string, ProviderDestination>();
  private readonly subscriptions = new Set<ActiveSubscription>();
  private readonly counters: MessageBusCounters = { handled: 0, redelivered: 0, discarded: 0, handlerErrors: 0, parseErrors: 0, publishErrors: 0 };
  private readonly contextErrorLogged = new Set<string>();
  private provider?: MessageBusProvider;
  private status: MessageBusStatus = 'idle';
  private reconnects = 0;
  private connectedTimes = 0;
  private inFlight = 0;
  private lastHandlerErrorAt?: string;
  private initPromise?: Promise<void>;
  private closePromise?: Promise<void>;

  /**
   * @param {object} config Message bus config.
   */
  constructor(config: MessageBusConfig) {
    const names = Object.keys(config?.destinations || {});
    if (names.length === 0) throw new MessageBusConfigError('At least one destination is required.');
    for (const name of names) {
      const destination = config.destinations[name];
      if (!DESTINATION_NAME_PATTERN.test(name)) throw new MessageBusConfigError(`Invalid destination name: ${name}`);
      if (!destination || typeof destination.address !== 'string' || destination.address.length === 0) {
        throw new MessageBusConfigError(`Destination ${name} must have a non-empty address.`);
      }
      const delays = Object.entries(destination.delays || {});
      for (const [label, delayMs] of delays) {
        if (!DESTINATION_NAME_PATTERN.test(label)) throw new MessageBusConfigError(`Invalid delay tier label in destination ${name}: ${label}`);
        if (typeof delayMs !== 'number' || !Number.isFinite(delayMs) || delayMs <= 0) {
          throw new MessageBusConfigError(`Invalid delay tier value in destination ${name}: ${label}`);
        }
      }
      this.destinations.set(name, {
        name,
        address: destination.address,
        delays: delays.map(([label, delayMs]) => ({ label, delayMs })).sort((a, b) => a.delayMs - b.delayMs),
      });
    }
    this.config = config;
  }

  /**
   * Connect to the provider.
   * @returns {Promise<void>}
   */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
      this.initPromise.catch(() => {
        this.initPromise = undefined;
      });
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const name = this.config.provider ?? DEFAULT_PROVIDER;
    const factory = getMessageBusProviderFactory(name);
    if (!factory) throw new MessageBusConfigError(`Unknown message bus provider: ${name}`);
    this.provider = factory({
      options: this.config.providerOptions ?? {},
      getLog: this.config.getLog,
      reconnectDelayMs: this.config.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS,
    });
    this.status = 'connecting';
    const connecting = this.provider.connect({
      onConnected: (): void => void this.onConnected(),
      onDisconnected: (error) => this.onDisconnected(error),
    });
    if (this.config.connectInBackground) {
      connecting.catch((error) => this.log('message-bus-connection-error', { error: errorRef(error) }, 'error'));
      return;
    }
    await connecting;
  }

  private async onConnected(): Promise<void> {
    if (this.status === 'closed') return;
    this.status = 'connected';
    this.connectedTimes++;
    if (this.connectedTimes > 1) this.reconnects++;
    this.log('message-bus-connected', { provider: this.provider?.name });
    try {
      await this.provider!.declare([...this.destinations.values()]);
      for (const subscription of this.subscriptions) await this.attach(subscription);
    } catch (error) {
      this.log('message-bus-connection-error', { error: errorRef(error) }, 'error');
    }
  }

  private onDisconnected(error?: Error): void {
    if (this.status !== 'closed') this.status = 'disconnected';
    this.log('message-bus-disconnected', { error: error ? errorRef(error) : undefined }, 'warn');
    for (const subscription of this.subscriptions) subscription.consumer = undefined;
  }

  /**
   * Publish a message.
   * @param {string} destination Logical destination name.
   * @param {object} payload Message payload (not mutated).
   * @param {object} [options] Publish options.
   * @returns {Promise<{messageId: string}>}
   */
  async publish(destination: string, payload: MessagePayload, options: PublishOptions = {}): Promise<PublishResult> {
    const target = this.destinations.get(destination);
    if (!target) throw new MessageBusConfigError(`Unknown destination: ${destination}`);
    if (!isPlainObject(payload)) throw new MessageBusConfigError('Payload must be a plain object.');

    const messageId = options.messageId ?? randomUUID();
    const body = Buffer.from(JSON.stringify({ ...payload, [MESSAGE_ID_FIELD]: messageId }));

    const limits = [this.config.maxPayloadBytes, this.provider?.capabilities.maxPayloadBytes].filter(
      (value): value is number => typeof value === 'number',
    );
    if (limits.length > 0 && body.length > Math.min(...limits)) throw new MessageTooLargeError(body.length, Math.min(...limits));

    const delay = this.pickDelay(target, options.delayMs);

    if (this.status === 'closed' || !this.provider)
      throw new MessageBusUnavailableError(this.status === 'closed' ? 'Message bus is closed.' : undefined);

    const ctx = this.logContextFor(destination, payload);
    const attempts = this.config.publishRetry?.attempts ?? 0;
    const retryDelayMs = this.config.publishRetry?.delayMs ?? 0;
    let lastError: unknown;
    for (let attempt = 0; attempt <= attempts; attempt++) {
      if (attempt > 0 && retryDelayMs > 0) await wait(retryDelayMs);
      try {
        await this.provider.send(target, body, { messageId, delay });
        this.safeLog('message-bus-published', { destination, messageId, length: body.length, delayMs: delay?.delayMs, ...ctx });
        return { messageId };
      } catch (error) {
        lastError = error;
      }
    }
    this.counters.publishErrors++;
    this.log('message-bus-publish-error', { destination, messageId, error: errorRef(lastError), ...ctx }, 'error');
    throw lastError instanceof MessageBusError ? lastError : new MessageBusPublishError('Failed to publish the message.', lastError);
  }

  private pickDelay(target: ProviderDestination, delayMs?: number): ProviderDelay | undefined {
    if (delayMs === undefined) return undefined;
    if (typeof delayMs !== 'number' || !Number.isFinite(delayMs)) throw new MessageBusConfigError('delayMs must be a finite number.');
    if (delayMs <= 0) return undefined;
    if (target.delays.length > 0) {
      const tier = target.delays.find((item) => item.delayMs >= delayMs) ?? target.delays[target.delays.length - 1];
      return { delayMs: tier.delayMs, label: tier.label };
    }
    if (this.provider?.capabilities.arbitraryDelay) return { delayMs };
    throw new MessageBusConfigError(`Destination ${target.name} does not support delays.`);
  }

  /**
   * Subscribe a handler to a destination.
   * @param {string} destination Logical destination name.
   * @param {function} handler Message handler.
   * @param {object} [options] Subscribe options.
   * @returns {Promise<Subscription>}
   */
  async subscribe(destination: string, handler: MessageHandler, options: SubscribeOptions = {}): Promise<Subscription> {
    if (!this.destinations.has(destination)) throw new MessageBusConfigError(`Unknown destination: ${destination}`);
    const concurrency = options.concurrency ?? 1;
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new MessageBusConfigError('concurrency must be an integer >= 1.');
    const subscription: ActiveSubscription = { destination, handler, concurrency, onFailure: options.onFailure };
    this.subscriptions.add(subscription);
    if (this.status === 'connected') await this.attach(subscription);
    return {
      destination,
      cancel: async (): Promise<void> => {
        this.subscriptions.delete(subscription);
        const consumer = subscription.consumer;
        subscription.consumer = undefined;
        await consumer?.cancel();
      },
    };
  }

  private async attach(subscription: ActiveSubscription): Promise<void> {
    const previous = subscription.consumer;
    subscription.consumer = undefined;
    if (previous) await previous.cancel().catch((error) => this.log('message-bus-connection-error', { error: errorRef(error) }, 'error'));
    const target = this.destinations.get(subscription.destination)!;
    subscription.consumer = await this.provider!.consume(target, { maxInFlight: subscription.concurrency }, (body) =>
      this.deliver(subscription, body),
    );
  }

  private deliver(subscription: ActiveSubscription, body: Buffer): Promise<SettleOutcome> {
    this.inFlight++;
    return new Promise<SettleOutcome>((resolve) => {
      const run = async (): Promise<void> => {
        try {
          resolve(await this.pipeline(subscription, body));
        } catch {
          resolve('discard');
        } finally {
          this.inFlight--;
        }
      };
      const runInContext = this.config.runInContext ?? runInAsyncLocalStorage;
      try {
        runInContext(run);
      } catch {
        this.inFlight--;
        resolve('discard');
      }
    });
  }

  private async pipeline(subscription: ActiveSubscription, body: Buffer): Promise<SettleOutcome> {
    const destination = subscription.destination;
    let payload: MessagePayload | undefined;
    let messageId: string | undefined;
    let ctx: LogContext = {};
    const startedAt = Date.now();
    try {
      let parsed: unknown;
      let reason: 'invalid-json' | 'not-an-object' | undefined;
      try {
        parsed = JSON.parse(body.toString('utf8'));
        if (!isPlainObject(parsed)) reason = 'not-an-object';
      } catch {
        reason = 'invalid-json';
      }
      if (reason) {
        this.counters.parseErrors++;
        this.counters.discarded++;
        this.log('message-bus-parse-error', { destination, length: body.length, reason }, 'error');
        return 'discard';
      }
      payload = parsed as MessagePayload;
      const id = payload[MESSAGE_ID_FIELD];
      messageId = typeof id === 'string' && id.length > 0 ? id : undefined;
      ctx = this.logContextFor(destination, payload);
      this.log('message-bus-received', { destination, messageId, ...ctx });

      let result: unknown;
      let failure: 'threw' | 'invalid-result' | undefined;
      let error: unknown;
      try {
        result = await subscription.handler(payload, { destination, messageId });
        if (typeof result !== 'boolean') {
          failure = 'invalid-result';
          error = new Error(`Handler returned ${typeof result}`);
        }
      } catch (thrown) {
        failure = 'threw';
        error = thrown;
      }

      if (!failure) {
        const durationMs = Date.now() - startedAt;
        if (result === true) {
          this.counters.handled++;
          this.log('message-bus-handled', { destination, messageId, durationMs, ...ctx });
          return 'done';
        }
        this.counters.redelivered++;
        this.log('message-bus-not-handled', { destination, messageId, durationMs, ...ctx }, 'warn');
        return 'redeliver';
      }
      return await this.failDelivery(subscription, { payload, messageId, ctx, failure, error, startedAt });
    } catch (pipelineError) {
      return await this.failDelivery(subscription, {
        payload: payload ?? {},
        messageId,
        ctx,
        failure: 'threw',
        error: pipelineError,
        startedAt,
      });
    }
  }

  private async failDelivery(
    subscription: ActiveSubscription,
    info: { payload: MessagePayload; messageId?: string; ctx: LogContext; failure: 'threw' | 'invalid-result'; error: unknown; startedAt: number },
  ): Promise<SettleOutcome> {
    const { payload, messageId, ctx, failure, error } = info;
    const destination = subscription.destination;
    this.counters.handlerErrors++;
    this.counters.discarded++;
    this.lastHandlerErrorAt = new Date().toISOString();
    let errorId: string | number | undefined;
    if (subscription.onFailure) {
      try {
        const record = await subscription.onFailure({ destination, messageId, payload, failure, error });
        const candidate = record && typeof record === 'object' ? record.errorId : undefined;
        if (
          (typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 128) ||
          (typeof candidate === 'number' && Number.isFinite(candidate))
        ) {
          errorId = candidate;
        }
      } catch (hookError) {
        this.safeLog('message-bus-failure-hook-error', { destination, messageId, ...ctx, error: errorRef(hookError) }, 'error');
      }
    }
    this.safeLog(
      'message-bus-handler-error',
      { destination, messageId, ...ctx, durationMs: Date.now() - info.startedAt, failure, error: errorRef(error), errorId },
      'error',
    );
    return 'discard';
  }

  /**
   * Stop consuming, wait for in-flight handlers and close the provider.
   * @param {object} [options] Close options.
   * @returns {Promise<void>}
   */
  close(options: CloseOptions = {}): Promise<void> {
    if (!this.closePromise) this.closePromise = this.doClose(options);
    return this.closePromise;
  }

  private async doClose(options: CloseOptions): Promise<void> {
    const provider = this.provider;
    if (!provider) {
      this.status = 'closed';
      return;
    }
    this.log('message-bus-closing', { inFlight: this.inFlight });
    for (const subscription of this.subscriptions) {
      const consumer = subscription.consumer;
      subscription.consumer = undefined;
      try {
        await consumer?.cancel();
      } catch (error) {
        this.log('message-bus-connection-error', { error: errorRef(error) }, 'error');
      }
    }
    const deadline = Date.now() + (options.drainTimeoutMs ?? 0);
    while (this.inFlight > 0 && Date.now() < deadline) await wait(100);
    try {
      await provider.close();
    } catch (error) {
      this.log('message-bus-connection-error', { error: errorRef(error) }, 'error');
    }
    this.status = 'closed';
    this.log('message-bus-closed', {});
  }

  /**
   * Current state and counters.
   * @returns {object} Health.
   */
  health(): MessageBusHealth {
    return {
      provider: this.provider?.name ?? this.config.provider ?? DEFAULT_PROVIDER,
      status: this.status,
      reconnects: this.reconnects,
      inFlight: this.inFlight,
      subscriptions: this.subscriptions.size,
      counters: { ...this.counters },
      lastHandlerErrorAt: this.lastHandlerErrorAt,
    };
  }

  private logContextFor(destination: string, payload: MessagePayload): LogContext {
    const extractor = this.config.destinations[destination].logContext ?? this.config.logContext;
    if (!extractor) return {};
    try {
      return sanitizeLogContext(extractor(payload) ?? {});
    } catch {
      if (!this.contextErrorLogged.has(destination)) {
        this.contextErrorLogged.add(destination);
        this.safeLog('message-bus-log-context-error', { destination }, 'warn');
      }
      return {};
    }
  }

  private log(event: string, data: Record<string, unknown>, level?: MessageBusLogLevel): void {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) if (value !== undefined) clean[key] = value;
    const log: MessageBusLog = this.config.getLog();
    log.save(event, clean, level);
  }

  private safeLog(event: string, data: Record<string, unknown>, level?: MessageBusLogLevel): void {
    try {
      this.log(event, data, level);
    } catch {
      // Logging must not change the outcome of a delivery.
    }
  }
}
