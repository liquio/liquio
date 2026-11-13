import { RedisClient } from '../../common/redis_client';
import { RabbitMqDedup, RabbitMqDedupOptions } from './rabbitmq_dedup';

jest.mock('../../common/redis_client');

const SENTINEL = 'SECRET-BODY-SENTINEL';
const save = jest.fn();
const getLog = () => ({ save });
const body = (id?: string) => Buffer.from(JSON.stringify({ amqpMessageId: id, data: SENTINEL }));

const makeStore = () => {
  const calls: string[] = [];
  const store = {
    get: jest.fn(async (key: string) => {
      calls.push(`get ${key}`);
      return null as string | null;
    }),
    set: jest.fn(async (key: string) => {
      calls.push(`set ${key}`);
      return 'OK';
    }),
  };
  return { store, calls };
};
const make = (store: any, extra: Partial<RabbitMqDedupOptions> = {}) =>
  new RabbitMqDedup({ isEnabled: true, getStore: () => store, ...extra }, getLog);

describe('RabbitMqDedup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    save.mockClear();
    (RedisClient as unknown as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('calls handle when disabled', async () => {
    const { store } = makeStore();
    const handle = jest.fn(async () => 'done' as const);
    await new RabbitMqDedup({ isEnabled: false, getStore: () => store }, getLog).run(body('a'), 'q', handle);
    await new RabbitMqDedup(undefined, getLog).run(body('a'), 'q', handle);
    expect(handle).toHaveBeenCalledTimes(2);
    expect(store.get).not.toHaveBeenCalled();
  });

  it('calls handle without a message id or store', async () => {
    const { store } = makeStore();
    const handle = jest.fn(async () => 'done' as const);
    await make(store).run(body(), 'q', handle);
    await make(null).run(body('a'), 'q', handle);
    expect(handle).toHaveBeenCalledTimes(2);
    expect(store.get).not.toHaveBeenCalled();
  });

  it('returns done without handle on a hit', async () => {
    const { store } = makeStore();
    store.get.mockResolvedValueOnce('a');
    const handle = jest.fn(async () => 'done' as const);
    expect(await make(store).run(body('a'), 'q', handle)).toBe('done');
    expect(handle).not.toHaveBeenCalled();
    expect(store.get).toHaveBeenCalledWith('amqp-message-id.a');
    expect(save).toHaveBeenCalledWith('message-bus-duplicate', { destination: 'q', messageId: 'a' }, 'info');
  });

  it('sets the processed key before returning done, with default ttl', async () => {
    const { store, calls } = makeStore();
    const order: string[] = [];
    const result = await make(store).run(body('a'), 'q', async () => 'done');
    order.push('returned');
    expect(result).toBe('done');
    expect(store.set).toHaveBeenCalledWith('amqp-message-id.a', 'a', 7200);
    expect(calls).toEqual(['get amqp-message-id.a', 'set amqp-message-id.a']);
    expect(order).toEqual(['returned']);
  });

  it('uses a configured ttl', async () => {
    const { store } = makeStore();
    await make(store, { ttl: 10 }).run(body('a'), 'q', async () => 'done');
    expect(store.set).toHaveBeenCalledWith('amqp-message-id.a', 'a', 10);
  });

  it.each(['redeliver', 'discard'] as const)('does not set the key for %s', async (outcome) => {
    const { store } = makeStore();
    expect(await make(store).run(body('a'), 'q', async () => outcome)).toBe(outcome);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('waits waitMs on a wip key and redelivers', async () => {
    const { store } = makeStore();
    store.get.mockResolvedValueOnce('a');
    const handle = jest.fn(async () => 'done' as const);
    let result: string | undefined;
    const promise = make(store, { inProgress: { isEnabled: true, waitMs: 5000 } })
      .run(body('a'), 'q', handle)
      .then((r) => (result = r));
    await jest.advanceTimersByTimeAsync(4999);
    expect(result).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    await promise;
    expect(result).toBe('redeliver');
    expect(handle).not.toHaveBeenCalled();
    expect(store.get).toHaveBeenCalledWith('amqp-message-id.a.wip');
    expect(save).toHaveBeenCalledWith('message-bus-in-progress-wait', { destination: 'q', messageId: 'a' }, 'info');
  });

  it('defaults waitMs to 300000', async () => {
    const { store } = makeStore();
    store.get.mockResolvedValueOnce('a');
    let done = false;
    const promise = make(store, { inProgress: { isEnabled: true } })
      .run(body('a'), 'q', async () => 'done')
      .then(() => (done = true));
    await jest.advanceTimersByTimeAsync(299999);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await promise;
    expect(done).toBe(true);
  });

  it('close ends a wait early', async () => {
    const { store } = makeStore();
    store.get.mockResolvedValueOnce('a');
    const dedup = make(store, { inProgress: { isEnabled: true } });
    const promise = dedup.run(body('a'), 'q', async () => 'done');
    await jest.advanceTimersByTimeAsync(0);
    await dedup.close();
    expect(await promise).toBe('redeliver');
  });

  it('sets the wip key with its ttl and never deletes it', async () => {
    const { store } = makeStore();
    await make(store, { inProgress: { isEnabled: true } }).run(body('a'), 'q', async () => 'done');
    expect(store.set).toHaveBeenCalledWith('amqp-message-id.a.wip', 'a', 600);
    expect(Object.keys(store)).toEqual(['get', 'set']);
  });

  it('is fail-open and logs store errors by name only', async () => {
    const { store } = makeStore();
    const boom = Object.assign(new Error(`redis://user:${SENTINEL}@host`), { name: 'ReplyError' });
    store.get.mockRejectedValue(boom);
    store.set.mockRejectedValue(boom);
    const handle = jest.fn(async () => 'done' as const);
    expect(await make(store, { inProgress: { isEnabled: true } }).run(body('a'), 'q', handle)).toBe('done');
    expect(handle).toHaveBeenCalledTimes(1);
    const warns = save.mock.calls.filter(([event]) => event === 'message-bus-dedup-error');
    expect(warns).toHaveLength(4);
    expect(warns[0]).toEqual([
      'message-bus-dedup-error',
      { destination: 'q', messageId: 'a', operation: 'get', key: 'in-progress', error: { name: 'ReplyError' } },
      'warn',
    ]);
    expect(warns[3][1]).toEqual({ destination: 'q', messageId: 'a', operation: 'set', key: 'processed', error: { name: 'ReplyError' } });
    expect(JSON.stringify(save.mock.calls)).not.toContain(SENTINEL);
  });

  it('creates and closes its own RedisClient', async () => {
    const client = { isEnabled: true, get: jest.fn(async () => null), set: jest.fn(async () => 'OK'), close: jest.fn(async () => undefined) };
    (RedisClient as unknown as jest.Mock).mockImplementation(() => client);
    const dedup = new RabbitMqDedup({ isEnabled: true, redis: { host: 'h', port: 1 } }, getLog);
    dedup.init();
    dedup.init();
    expect(RedisClient).toHaveBeenCalledTimes(1);
    expect(RedisClient).toHaveBeenCalledWith(expect.objectContaining({ host: 'h', port: 1 }));
    await dedup.run(body('a'), 'q', async () => 'done');
    expect(client.set).toHaveBeenCalled();
    await dedup.close();
    expect(client.close).toHaveBeenCalledTimes(1);
  });

  it('skips dedup when its own client is disabled, and never closes a getStore store', async () => {
    (RedisClient as unknown as jest.Mock).mockImplementation(() => ({ isEnabled: false, close: jest.fn() }));
    const dedup = new RabbitMqDedup({ isEnabled: true, redis: { host: '', port: 0 } }, getLog);
    dedup.init();
    const handle = jest.fn(async () => 'done' as const);
    await dedup.run(body('a'), 'q', handle);
    expect(handle).toHaveBeenCalled();
    const { store } = makeStore();
    const withStore = make(store, { redis: { host: 'h', port: 1 } });
    withStore.init();
    expect(RedisClient).toHaveBeenCalledTimes(1);
  });
});
