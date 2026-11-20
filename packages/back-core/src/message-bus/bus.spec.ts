import { getTraceId } from '../common/async_local_storage';
import { MessageBus } from './bus';
import { getRetryDelayMs } from './constants';
import { MessageBusConfigError, MessageBusPublishError, MessageBusUnavailableError, MessageTooLargeError } from './errors';
import { createMessageBus } from './factory';
import { MessageBusProvider } from './provider';
import { MemoryMessageBusProvider } from './providers/memory';
import { getMessageBusProviderFactory, registerMessageBusProvider } from './registry';
import { MessageBusConfig, MessageHandler } from './types';

const save = jest.fn();
const logs = () => save.mock.calls.map((c) => ({ event: c[0] as string, data: c[1], level: c[2] }));
const logsOf = (event: string) => logs().filter((l) => l.event === event);
const flush = () => jest.advanceTimersByTimeAsync(0);
const providerOf = (bus: MessageBus) => (bus as any).provider as MemoryMessageBusProvider;
const extractor = (payload: Record<string, unknown>) => ({ workflowId: payload.workflowId as string });

const make = (extra: Partial<MessageBusConfig> = {}) =>
  createMessageBus({
    provider: 'memory',
    destinations: { a: { address: 'qa', delays: { 'errors-1h': 3600000, 'errors-10m': 600000 }, logContext: extractor }, plain: { address: 'qp' } },
    getLog: () => ({ save }),
    ...extra,
  });

const started = async (extra: Partial<MessageBusConfig> = {}) => {
  const bus = make(extra);
  await bus.init();
  return bus;
};

describe('MessageBus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    save.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  describe('constructor', () => {
    const cfg = (destinations: MessageBusConfig['destinations']) => ({ destinations, getLog: () => ({ save }) });
    it('validates input', () => {
      expect(() => new MessageBus(cfg({}))).toThrow(MessageBusConfigError);
      expect(() => new MessageBus(cfg({ '-bad': { address: 'x' } }))).toThrow(MessageBusConfigError);
      expect(() => new MessageBus(cfg({ ok: { address: '' } }))).toThrow(MessageBusConfigError);
      expect(() => new MessageBus(cfg({ ok: { address: 'x', delays: { 'bad label': 1 } } }))).toThrow(MessageBusConfigError);
      expect(() => new MessageBus(cfg({ ok: { address: 'x', delays: { t: 0 } } }))).toThrow(MessageBusConfigError);
      expect(() => new MessageBus(cfg({ ok: { address: 'x', delays: { t: Infinity } } }))).toThrow(MessageBusConfigError);
      expect(() => new MessageBus(cfg({ ok: { address: 'x', delays: { t: 1 } } }))).not.toThrow();
    });
  });

  describe('init', () => {
    it('rejects an unknown provider', async () => {
      const bus = make({ provider: 'nope' });
      await expect(bus.init()).rejects.toThrow('Unknown message bus provider: nope');
    });

    it('uses rabbitmq by default', async () => {
      const original = getMessageBusProviderFactory('rabbitmq');
      const factory = jest.fn(() => {
        throw new Error('stub');
      });
      registerMessageBusProvider('rabbitmq', factory);
      try {
        const bus = make({ provider: undefined });
        await expect(bus.init()).rejects.toThrow('stub');
        expect(factory).toHaveBeenCalledTimes(1);
        expect(bus.health().status).toBe('idle');
      } finally {
        if (original) registerMessageBusProvider('rabbitmq', original);
      }
    });

    it('resolves before the connection with connectInBackground', async () => {
      let connect!: () => void;
      const stub = (): MessageBusProvider => ({
        name: 'slow',
        capabilities: { arbitraryDelay: false },
        connect: (events) =>
          new Promise<void>((resolve) => {
            connect = () => {
              events.onConnected();
              resolve();
            };
          }),
        declare: async () => undefined,
        send: async () => undefined,
        consume: async () => ({ cancel: async () => undefined }),
        close: async () => undefined,
      });
      registerMessageBusProvider('slow', stub);
      const bus = make({ provider: 'slow', connectInBackground: true });
      await bus.init();
      expect(bus.health().status).toBe('connecting');
      connect();
      await flush();
      expect(bus.health().status).toBe('connected');
    });

    it('is idempotent', async () => {
      const bus = await started();
      const provider = providerOf(bus);
      await bus.init();
      expect(providerOf(bus)).toBe(provider);
    });
  });

  describe('publish', () => {
    it('stamps a fresh id, honours messageId and does not mutate the payload', async () => {
      const bus = await started();
      const payload = { workflowId: 'w' };
      const first = await bus.publish('a', payload);
      const second = await bus.publish('a', payload, { messageId: 'mine' });
      expect(first.messageId).toEqual(expect.any(String));
      expect(second.messageId).toBe('mine');
      expect(payload).toEqual({ workflowId: 'w' });
      const queued = providerOf(bus).messages('qa');
      expect(queued[0].amqpMessageId).toBe(first.messageId);
      expect(queued[1].amqpMessageId).toBe('mine');
    });

    it('rejects bad input', async () => {
      const bus = await started();
      await expect(bus.publish('a', null as any)).rejects.toThrow(MessageBusConfigError);
      await expect(bus.publish('a', [] as any)).rejects.toThrow(MessageBusConfigError);
      await expect(bus.publish('zzz', {})).rejects.toThrow(MessageBusConfigError);
      await expect(bus.publish('a', {}, { delayMs: NaN })).rejects.toThrow(MessageBusConfigError);
    });

    it('rejects too large messages', async () => {
      const bus = await started({ maxPayloadBytes: 100 });
      const error = await bus.publish('a', { big: 'x'.repeat(200) }).catch((e) => e);
      expect(error).toBeInstanceOf(MessageTooLargeError);
      expect(error.limitBytes).toBe(100);
      expect(error.sizeBytes).toBeGreaterThan(200);
      expect(providerOf(bus).messages('qa')).toHaveLength(0);
    });

    it('uses the smaller of the config and provider limits', async () => {
      const bus = await started({ maxPayloadBytes: 1000, providerOptions: { maxPayloadBytes: 50 } });
      await expect(bus.publish('a', { big: 'x'.repeat(100) })).rejects.toMatchObject({ limitBytes: 50 });
    });

    it('rejects after close', async () => {
      const bus = await started();
      await bus.close();
      await expect(bus.publish('a', {})).rejects.toThrow(MessageBusUnavailableError);
    });

    it('retries and logs the final error without the payload', async () => {
      const bus = await started({ publishRetry: { attempts: 2, delayMs: 1000 } });
      const provider = providerOf(bus);
      const sendSpy = jest.spyOn(provider, 'send').mockRejectedValue(Object.assign(new Error('SENTINEL-6 broker down'), { code: 'E_DOWN' }));
      const promise = bus.publish('a', { workflowId: 'w', initData: 'SENTINEL-2' }).catch((e) => e);
      await jest.advanceTimersByTimeAsync(2500);
      const error = await promise;
      expect(sendSpy).toHaveBeenCalledTimes(3);
      expect(error).toBeInstanceOf(MessageBusPublishError);
      const entries = logsOf('message-bus-publish-error');
      expect(entries).toHaveLength(1);
      expect(entries[0].data.error).toEqual({ name: 'Error', code: 'E_DOWN' });
      expect(entries[0].data.workflowId).toBe('w');
      expect(bus.health().counters.publishErrors).toBe(1);
      expect(JSON.stringify(save.mock.calls)).not.toMatch(/SENTINEL/);
    });

    it('does not retry by default', async () => {
      const bus = await started();
      providerOf(bus).failNextSend(new Error('x'));
      await expect(bus.publish('a', {})).rejects.toThrow(MessageBusPublishError);
    });
  });

  describe('delay tiers', () => {
    const sent = async (extra: Partial<MessageBusConfig>, destination: string, delayMs: number) => {
      const bus = await started(extra);
      const spy = jest.spyOn(providerOf(bus), 'send');
      await bus.publish(destination, {}, { delayMs });
      return spy.mock.calls[0][2].delay;
    };

    it('picks the matching tier', async () => {
      expect(await sent({}, 'a', 600000)).toEqual({ delayMs: 600000, label: 'errors-10m' });
      expect(await sent({}, 'a', 700000)).toEqual({ delayMs: 3600000, label: 'errors-1h' });
      expect(await sent({}, 'a', 99999999)).toEqual({ delayMs: 3600000, label: 'errors-1h' });
      expect(await sent({}, 'a', 0)).toBeUndefined();
    });

    it('passes the raw delay without tiers when arbitrary delay is supported', async () => {
      expect(await sent({}, 'plain', 1234)).toEqual({ delayMs: 1234 });
    });

    it('rejects a delay without tiers when arbitrary delay is not supported', async () => {
      registerMessageBusProvider('nodelay', () => ({
        name: 'nodelay',
        capabilities: { arbitraryDelay: false },
        connect: async (events) => events.onConnected(),
        declare: async () => undefined,
        send: async () => undefined,
        consume: async () => ({ cancel: async () => undefined }),
        close: async () => undefined,
      }));
      const bus = await started({ provider: 'nodelay' });
      await expect(bus.publish('plain', {}, { delayMs: 10 })).rejects.toThrow(MessageBusConfigError);
    });

    it('getRetryDelayMs', () => {
      expect(getRetryDelayMs('10m')).toBe(600000);
      expect(getRetryDelayMs('x')).toBe(86400000);
    });
  });

  describe('pipeline', () => {
    const subscribed = async (handler: MessageHandler, options = {}, extra: Partial<MessageBusConfig> = {}) => {
      const bus = await started(extra);
      await bus.subscribe('a', handler, options);
      return bus;
    };

    it('true is done, false is redelivered', async () => {
      let calls = 0;
      const bus = await subscribed(() => ++calls > 1);
      await bus.publish('a', { workflowId: 'w' });
      await flush();
      expect(calls).toBe(2);
      expect(bus.health().counters).toMatchObject({ handled: 1, redelivered: 1 });
      expect(logsOf('message-bus-not-handled')[0].level).toBe('warn');
      expect(logsOf('message-bus-handled')[0].data).toMatchObject({ destination: 'a', workflowId: 'w' });
    });

    it.each([['not json'], ['[1]'], ['null'], ['"SENTINEL-5"']])('discards an unparseable body %s', async (raw) => {
      const handler = jest.fn(() => true);
      const bus = await subscribed(handler);
      providerOf(bus).injectRaw('qa', raw);
      await flush();
      expect(handler).not.toHaveBeenCalled();
      expect(logsOf('message-bus-parse-error')).toHaveLength(1);
      expect(logsOf('message-bus-parse-error')[0].level).toBe('error');
      expect(bus.health().counters).toMatchObject({ parseErrors: 1, discarded: 1 });
      expect((providerOf(bus) as any).broker.discardedList('qa')).toHaveLength(1);
    });

    it('treats handler failures as discards with no hot loop', async () => {
      const results: Array<() => unknown> = [
        () => {
          throw new Error('x');
        },
        async () => {
          throw new Error('x');
        },
        () => undefined,
        () => null,
        () => 0,
        () => 'yes',
        () => ({}),
      ];
      for (const result of results) {
        save.mockReset();
        const handler = jest.fn(result as MessageHandler);
        const bus = await subscribed(handler);
        await bus.publish('a', { workflowId: 'w', initData: 'SENTINEL-2' });
        await jest.advanceTimersByTimeAsync(60000);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(providerOf(bus).discarded('qa')).toHaveLength(1);
        const entries = logsOf('message-bus-handler-error');
        expect(entries).toHaveLength(1);
        expect(entries[0].level).toBe('error');
        expect(entries[0].data.workflowId).toBe('w');
        expect(['threw', 'invalid-result']).toContain(entries[0].data.failure);
        expect(entries[0].data.error.name).toEqual(expect.any(String));
        expect(JSON.stringify(save.mock.calls)).not.toMatch(/SENTINEL|stack/);
        const health = bus.health();
        expect(health.counters).toMatchObject({ handlerErrors: 1, discarded: 1 });
        expect(health.lastHandlerErrorAt).toEqual(expect.any(String));
      }
    });

    it('does not log error messages', async () => {
      const bus = await subscribed(() => {
        throw Object.assign(new TypeError('bad value SENTINEL-6'), { code: 'E_BAD' });
      });
      await bus.publish('a', { workflowId: 'w' });
      await flush();
      expect(logsOf('message-bus-handler-error')[0].data.error).toEqual({ name: 'TypeError', code: 'E_BAD' });
      expect(logsOf('message-bus-handler-error')[0].data.failure).toBe('threw');
      expect(JSON.stringify(save.mock.calls)).not.toContain('SENTINEL-6');
    });

    it('non-Error thrown values give NonError', async () => {
      const bus = await subscribed(() => {
        throw { message: 'SENTINEL-6' };
      });
      await bus.publish('a', {});
      await flush();
      expect(logsOf('message-bus-handler-error')[0].data.error).toEqual({ name: 'NonError' });
    });

    describe('failure hook', () => {
      const failing = () => {
        throw new Error('x');
      };

      it('is called once with the failure and its errorId is logged', async () => {
        const onFailure = jest.fn(() => ({ errorId: 42 }));
        const bus = await subscribed(failing, { onFailure });
        await bus.publish('a', { workflowId: 'w' });
        await flush();
        expect(onFailure).toHaveBeenCalledTimes(1);
        const arg = (onFailure.mock.calls[0] as any)[0];
        expect(arg).toMatchObject({ destination: 'a', failure: 'threw', payload: { workflowId: 'w' } });
        expect(arg.error).toBeInstanceOf(Error);
        expect(logsOf('message-bus-handler-error')[0].data.errorId).toBe(42);
      });

      it('reports invalid results with a generic error', async () => {
        const onFailure = jest.fn();
        const bus = await subscribed(() => 'yes' as any, { onFailure });
        await bus.publish('a', {});
        await flush();
        const arg = (onFailure.mock.calls[0] as any)[0];
        expect(arg.failure).toBe('invalid-result');
        expect(arg.error.message).toBe('Handler returned string');
      });

      it('drops an invalid errorId', async () => {
        for (const errorId of [{ a: 1 }, 'x'.repeat(129)]) {
          save.mockReset();
          const bus = await subscribed(failing, { onFailure: () => ({ errorId }) as any });
          await bus.publish('a', {});
          await flush();
          expect(logsOf('message-bus-handler-error')[0].data).not.toHaveProperty('errorId');
        }
      });

      it('survives a throwing or rejecting hook', async () => {
        for (const hook of [
          () => {
            throw Object.assign(new Error('SENTINEL-6'), { code: 'E_HOOK' });
          },
          async () => {
            throw new Error('SENTINEL-6');
          },
        ]) {
          save.mockReset();
          const bus = await subscribed(failing, { onFailure: hook });
          await bus.publish('a', {});
          await flush();
          expect(logsOf('message-bus-failure-hook-error')).toHaveLength(1);
          expect(logsOf('message-bus-handler-error')).toHaveLength(1);
          expect(logsOf('message-bus-handler-error')[0].data).not.toHaveProperty('errorId');
          expect(providerOf(bus).discarded('qa')).toHaveLength(1);
          expect(JSON.stringify(save.mock.calls)).not.toContain('SENTINEL-6');
        }
      });

      it('is not called for true, false or parse errors', async () => {
        const onFailure = jest.fn();
        let value = true;
        const bus = await subscribed(() => value, { onFailure });
        await bus.publish('a', {});
        await flush();
        value = false;
        const stop = bus.subscribe('a', () => true);
        void stop;
        providerOf(bus).injectRaw('qa', 'garbage');
        await flush();
        expect(onFailure).not.toHaveBeenCalled();
      });
    });

    it('never logs bodies', async () => {
      const handlers: MessageHandler[] = [() => true, () => false, () => undefined as any];
      let index = 0;
      const bus = await subscribed(() => {
        const handler = handlers[Math.min(index++, 2)];
        return handler({}, { destination: 'a' });
      });
      // handler 1 -> true, 2 -> false (redelivered, then true because index>=2 uses undefined) keep it simple
      const payload = {
        workflowId: 'w1',
        performerUsersIpn: 'SENTINEL-1',
        initData: { secret: 'SENTINEL-2' },
        performerUsersEmail: ['SENTINEL-3@example.test'],
        big: 'x'.repeat(10240),
      };
      await bus.publish('a', payload);
      await jest.advanceTimersByTimeAsync(100);
      await bus.publish('a', payload);
      providerOf(bus).injectRaw('qa', 'SENTINEL-4 not json');
      providerOf(bus).injectRaw('qa', '"SENTINEL-5"');
      providerOf(bus).failNextSend(new Error('SENTINEL-4 broker'));
      await bus.publish('a', payload).catch(() => undefined);
      await jest.advanceTimersByTimeAsync(100);
      const text = JSON.stringify(save.mock.calls);
      expect(text).not.toMatch(/SENTINEL/);
      expect(text).not.toContain('xxxxxxxxxx');
      for (const entry of logsOf('message-bus-received')) {
        expect(entry.data.messageId).toEqual(expect.any(String));
        expect(entry.data.workflowId).toBe('w1');
        expect(Object.keys(entry.data).sort()).toEqual(['destination', 'messageId', 'workflowId']);
      }
      expect(logsOf('message-bus-published')[0].data).toMatchObject({ destination: 'a', workflowId: 'w1', length: expect.any(Number) });
    });

    it('sanitizes a malicious extractor and survives a throwing one', async () => {
      const bus = await started({
        destinations: {
          a: { address: 'qa', logContext: () => ({ body: 'SENTINEL-1', nested: { x: 'SENTINEL-2' }, ok: 'fine' }) as any },
          b: {
            address: 'qb',
            logContext: () => {
              throw new Error('SENTINEL-3');
            },
          },
        },
      });
      await bus.subscribe('a', () => true);
      await bus.subscribe('b', () => true);
      await bus.publish('a', {});
      await bus.publish('b', {});
      await bus.publish('b', {});
      await flush();
      expect(logsOf('message-bus-received')[0].data.ok).toBe('fine');
      expect(logsOf('message-bus-log-context-error')).toHaveLength(1);
      expect(JSON.stringify(save.mock.calls)).not.toMatch(/SENTINEL/);
    });

    it('works with a provider that settles without calling handle', async () => {
      let consumer!: (body: Buffer) => Promise<unknown>;
      registerMessageBusProvider('skipper', () => ({
        name: 'skipper',
        capabilities: { arbitraryDelay: false },
        connect: async (events) => events.onConnected(),
        declare: async () => undefined,
        send: async () => undefined,
        consume: async (_d, _o, handle) => {
          consumer = handle;
          return { cancel: async () => undefined };
        },
        close: async () => undefined,
      }));
      const bus = await started({ provider: 'skipper' });
      await bus.subscribe('a', () => true);
      await flush();
      expect(bus.health().inFlight).toBe(0);
      await consumer(Buffer.from('{}'));
      expect(bus.health().inFlight).toBe(0);
    });

    it('limits concurrency', async () => {
      let running = 0;
      let max = 0;
      const releases: Array<() => void> = [];
      const bus = await subscribed(
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
      for (let i = 0; i < 4; i++) await bus.publish('a', { i });
      await flush();
      expect(running).toBe(2);
      expect(bus.health().inFlight).toBe(2);
      while (releases.length) {
        releases.shift()!();
        await flush();
      }
      expect(max).toBe(2);
      expect(bus.health().inFlight).toBe(0);
    });

    it('wraps deliveries in the async context', async () => {
      let traceId: string | undefined;
      const bus = await subscribed(() => {
        traceId = getTraceId();
        return true;
      });
      await bus.publish('a', {});
      await flush();
      expect(traceId).toEqual(expect.any(String));
    });

    it('honours a custom runInContext', async () => {
      const runInContext = jest.fn((fn: () => Promise<void>) => void fn());
      const bus = await subscribed(() => true, {}, { runInContext });
      await bus.publish('a', {});
      await flush();
      expect(runInContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('validates and cancels', async () => {
      const bus = await started();
      await expect(bus.subscribe('zzz', () => true)).rejects.toThrow(MessageBusConfigError);
      await expect(bus.subscribe('a', () => true, { concurrency: 0 })).rejects.toThrow(MessageBusConfigError);
      await expect(bus.subscribe('a', () => true, { concurrency: 1.5 })).rejects.toThrow(MessageBusConfigError);
      const handler = jest.fn(() => true);
      const subscription = await bus.subscribe('a', handler);
      expect(bus.health().subscriptions).toBe(1);
      await subscription.cancel();
      expect(bus.health().subscriptions).toBe(0);
      await bus.publish('a', {});
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('attaches on connect when subscribed before init', async () => {
      const bus = make();
      const handler = jest.fn(() => true);
      await bus.subscribe('a', handler);
      await bus.init();
      await bus.publish('a', {});
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnect', () => {
    it('re-attaches subscriptions and ignores stale outcomes', async () => {
      const bus = await started();
      let release!: () => void;
      let calls = 0;
      await bus.subscribe(
        'a',
        () =>
          new Promise<boolean>((resolve) => {
            calls++;
            if (calls === 1) release = () => resolve(true);
            else resolve(true);
          }),
      );
      const provider = providerOf(bus);
      const declare = jest.spyOn(provider, 'declare');
      await bus.publish('a', { n: 1 });
      await flush();
      provider.simulateDisconnect();
      expect(bus.health().status).toBe('disconnected');
      await expect(bus.publish('a', {})).rejects.toThrow(MessageBusUnavailableError);
      provider.simulateReconnect();
      await flush();
      release();
      await flush();
      expect(declare).toHaveBeenCalledTimes(1);
      expect(bus.health().status).toBe('connected');
      expect(bus.health().reconnects).toBe(1);
      expect(calls).toBe(2);
    });
  });

  describe('close', () => {
    it('waits for in-flight handlers, then closes; double close is a no-op', async () => {
      const bus = await started();
      let release!: () => void;
      await bus.subscribe('a', () => new Promise<boolean>((resolve) => (release = () => resolve(true))));
      await bus.publish('a', {});
      await flush();
      expect(bus.health().inFlight).toBe(1);
      const closing = bus.close({ drainTimeoutMs: 5000 });
      await jest.advanceTimersByTimeAsync(300);
      expect(bus.health().status).not.toBe('closed');
      release();
      await jest.advanceTimersByTimeAsync(200);
      await closing;
      expect(bus.health().status).toBe('closed');
      await bus.close();
      expect(logsOf('message-bus-closed')).toHaveLength(1);
    });

    it('gives up after the drain timeout', async () => {
      const bus = await started();
      await bus.subscribe('a', () => new Promise<boolean>(() => undefined));
      await bus.publish('a', {});
      await flush();
      const closing = bus.close({ drainTimeoutMs: 250 });
      await jest.advanceTimersByTimeAsync(500);
      await closing;
      expect(bus.health().status).toBe('closed');
    });

    it('only sets the status when never initialised', async () => {
      const bus = make();
      await bus.close();
      expect(bus.health().status).toBe('closed');
    });
  });
});
