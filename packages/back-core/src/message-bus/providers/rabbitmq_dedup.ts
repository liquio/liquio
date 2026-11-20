import { RedisClient } from '../../common/redis_client';
import { extractMessageId } from '../constants';
import { SettleOutcome } from '../provider';
import { MessageBusLog } from '../types';

// Kept so existing keys keep matching.
const PROCESSED_KEY_PREFIX = 'amqp-message-id.';
const IN_PROGRESS_KEY_SUFFIX = '.wip';

const DEFAULT_TTL_SECONDS = 7200;
const DEFAULT_IN_PROGRESS_TTL_SECONDS = 600;
const DEFAULT_IN_PROGRESS_WAIT_MS = 300000;

export interface RabbitMqDedupStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<unknown>;
}

export interface RabbitMqDedupOptions {
  /** Default false. */
  isEnabled?: boolean;
  /** TTL of the "processed" marker, seconds. Default 7200. */
  ttl?: number;
  /** Optional "being processed" marker (wip lock). */
  inProgress?: { isEnabled?: boolean; ttl?: number; waitMs?: number };
  /** Store lookup per message; a falsy result skips dedup for that message. Takes precedence over `redis`. */
  getStore?: () => RabbitMqDedupStore | null | undefined;
  /** Connection for a store the provider opens itself (back-core RedisClient) when `getStore` is not given. */
  redis?: { host: string; port: number };
}

interface Waiter {
  timer: NodeJS.Timeout;
  resolve: () => void;
}

/**
 * Duplicate suppression of the rabbitmq provider. Fail-open: a store error is logged and processing continues.
 */
export class RabbitMqDedup {
  private ownClient?: RedisClient;
  private readonly waiters = new Set<Waiter>();

  /**
   * @param {object} [options] Dedup options.
   * @param {function} getLog Log getter.
   */
  constructor(
    private readonly options: RabbitMqDedupOptions | undefined,
    private readonly getLog: () => MessageBusLog,
  ) {}

  get isEnabled(): boolean {
    return this.options?.isEnabled === true;
  }

  /** Open the provider-owned store, if one is configured. Idempotent. */
  init(): void {
    if (!this.isEnabled || this.options?.getStore || !this.options?.redis || this.ownClient) return;
    this.ownClient = new RedisClient({ host: this.options.redis.host, port: this.options.redis.port, getLog: this.getLog as any });
  }

  /**
   * Run the handler unless the message is a duplicate.
   * @param {Buffer} body Serialized message.
   * @param {string} destination Destination address.
   * @param {function} handle Core handler.
   * @returns {Promise<string>} Settle outcome.
   */
  async run(body: Buffer, destination: string, handle: () => Promise<SettleOutcome>): Promise<SettleOutcome> {
    if (!this.isEnabled) return handle();
    const messageId = extractMessageId(body);
    const store = messageId ? this.store() : undefined;
    if (!messageId || !store) return handle();

    const processedKey = PROCESSED_KEY_PREFIX + messageId;
    const inProgressKey = processedKey + IN_PROGRESS_KEY_SUFFIX;
    const inProgress = this.options?.inProgress;
    const inProgressEnabled = inProgress?.isEnabled === true;
    const ctx = { destination, messageId };

    if (inProgressEnabled) {
      const existing = await this.attempt(() => store.get(inProgressKey), ctx, 'get', 'in-progress');
      if (existing) {
        this.getLog().save('message-bus-in-progress-wait', ctx, 'info');
        await this.wait(inProgress?.waitMs ?? DEFAULT_IN_PROGRESS_WAIT_MS);
        return 'redeliver';
      }
      await this.attempt(() => store.set(inProgressKey, messageId, inProgress?.ttl ?? DEFAULT_IN_PROGRESS_TTL_SECONDS), ctx, 'set', 'in-progress');
    }

    const processed = await this.attempt(() => store.get(processedKey), ctx, 'get', 'processed');
    if (processed) {
      this.getLog().save('message-bus-duplicate', ctx, 'info');
      return 'done';
    }

    const outcome = await handle();
    if (outcome === 'done') {
      await this.attempt(() => store.set(processedKey, messageId, this.options?.ttl ?? DEFAULT_TTL_SECONDS), ctx, 'set', 'processed');
    }
    return outcome;
  }

  /** End pending waits and close the provider-owned store. Never throws. */
  async close(): Promise<void> {
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    this.waiters.clear();
    const client = this.ownClient;
    this.ownClient = undefined;
    if (!client) return;
    try {
      await client.close();
    } catch (error) {
      this.getLog().save('message-bus-dedup-error', { operation: 'close', error: { name: errorName(error) } }, 'warn');
    }
  }

  private store(): RabbitMqDedupStore | null | undefined {
    if (this.options?.getStore) {
      try {
        return this.options.getStore();
      } catch {
        return undefined;
      }
    }
    return this.ownClient?.isEnabled ? (this.ownClient as unknown as RabbitMqDedupStore) : undefined;
  }

  private async attempt<T>(
    operation: () => Promise<T>,
    ctx: { destination: string; messageId: string },
    name: 'get' | 'set',
    key: 'processed' | 'in-progress',
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.getLog().save('message-bus-dedup-error', { ...ctx, operation: name, key, error: { name: errorName(error) } }, 'warn');
      return undefined;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const waiter: Waiter = {
        timer: setTimeout(() => {
          this.waiters.delete(waiter);
          resolve();
        }, ms),
        resolve,
      };
      this.waiters.add(waiter);
    });
  }
}

function errorName(error: unknown): string {
  const name = error instanceof Error ? error.name : undefined;
  return typeof name === 'string' && name.length > 0 && name.length <= 64 ? name : 'Error';
}
