import { MessageBusConfigError } from '../errors';
import { createMessageBus } from '../factory';
import { MemoryBroker, MemoryMessageBusProvider } from './memory';
import { MessageBus } from '../bus';
import { MessageBusConfig, MessagePayload } from '../types';

const save = jest.fn();
const config = (extra: Partial<MessageBusConfig> = {}): MessageBusConfig => ({
  provider: 'memory',
  destinations: { a: { address: 'qa' } },
  getLog: () => ({ save }),
  ...extra,
});
const flush = () => jest.advanceTimersByTimeAsync(0);
const providerOf = (bus: MessageBus) => (bus as any).provider as MemoryMessageBusProvider;

describe('memory provider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    save.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('delivers in FIFO order', async () => {
    const bus = createMessageBus(config());
    await bus.init();
    const seen: unknown[] = [];
    await bus.publish('a', { n: 1 });
    await bus.publish('a', { n: 2 });
    await bus.publish('a', { n: 3 });
    expect(providerOf(bus).messages('qa')).toHaveLength(3);
    await bus.subscribe('a', (p) => {
      seen.push(p.n);
      return true;
    });
    await flush();
    expect(seen).toEqual([1, 2, 3]);
  });

  it('applies delays', async () => {
    const bus = createMessageBus(config());
    await bus.init();
    const handler = jest.fn(() => true);
    await bus.subscribe('a', handler);
    await bus.publish('a', { n: 1 }, { delayMs: 5000 });
    await jest.advanceTimersByTimeAsync(4999);
    expect(handler).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('respects maxInFlight', async () => {
    const bus = createMessageBus(config());
    await bus.init();
    let running = 0;
    let max = 0;
    const releases: Array<() => void> = [];
    await bus.subscribe(
      'a',
      () =>
        new Promise<boolean>((resolve) => {
          running++;
          max = Math.max(max, running);
          releases.push(() => {
            running--;
            resolve(true);
          });
        }),
      { concurrency: 2 },
    );
    for (let i = 0; i < 5; i++) await bus.publish('a', { i });
    await flush();
    expect(running).toBe(2);
    while (releases.length) {
      releases.shift()!();
      await flush();
    }
    expect(max).toBe(2);
  });

  it('shares queues through a broker', async () => {
    const broker = new MemoryBroker();
    const first = createMessageBus(config({ providerOptions: { broker } }));
    const second = createMessageBus(config({ providerOptions: { broker } }));
    await first.init();
    await second.init();
    const seen: MessagePayload[] = [];
    await second.subscribe('a', (p) => {
      seen.push(p);
      return true;
    });
    await first.publish('a', { n: 1 });
    await flush();
    expect(seen).toHaveLength(1);
  });

  it('does not redeliver discarded messages', async () => {
    const bus = createMessageBus(config());
    await bus.init();
    const handler = jest.fn(() => undefined as unknown as boolean);
    await bus.subscribe('a', handler);
    await bus.publish('a', { n: 1 });
    await jest.advanceTimersByTimeAsync(60000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(providerOf(bus).discarded('qa')).toHaveLength(1);
    expect(providerOf(bus).messages('qa')).toHaveLength(0);
  });

  describe('production guard', () => {
    const original = process.env.NODE_ENV;
    afterEach(() => {
      if (original === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = original;
    });

    it('refuses to start in production', async () => {
      process.env.NODE_ENV = 'production';
      const bus = createMessageBus(config());
      await expect(bus.init()).rejects.toThrow(MessageBusConfigError);
      await expect(bus.init()).rejects.toThrow(
        'The memory message bus provider is for development and tests only and cannot be used when NODE_ENV=production.',
      );
      expect(bus.health().status).toBe('idle');
    });

    it.each(['test', 'development', undefined])('works with NODE_ENV=%s', async (value) => {
      if (value === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = value;
      const bus = createMessageBus(config());
      await expect(bus.init()).resolves.toBeUndefined();
    });
  });
});
