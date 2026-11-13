import { EventEmitter } from 'node:events';

import amqp from 'amqplib';

import { MessageBusConfigError, MessageBusPublishError, MessageBusUnavailableError } from '../errors';
import { createMessageBus } from '../factory';
import { MESSAGE_BUS_RETRY_DELAYS } from '../constants';
import { ProviderDestination } from '../provider';
import { RabbitMqMessageBusProvider } from './rabbitmq';

jest.mock('amqplib', () => ({ __esModule: true, default: { connect: jest.fn() } }));

const SENTINEL = 'SENTINEL-SECRET';
const URL = 'amqp://user:p4ssw0rd@host:5672';
const save = jest.fn();
const getLog = () => ({ save });
const connectMock = amqp.connect as unknown as jest.Mock;

class FakeChannel extends EventEmitter {
  assertQueue = jest.fn(async (..._args: any[]) => ({}));
  prefetch = jest.fn(async () => undefined);
  consumer?: (msg: any) => void;
  consume = jest.fn(async (_queue: string, cb: (msg: any) => void, _opts?: object) => {
    this.consumer = cb;
    return { consumerTag: 'tag' };
  });
  cancel = jest.fn(async () => undefined);
  close = jest.fn(async () => undefined);
  ack = jest.fn();
  nack = jest.fn();
  confirmError: Error | null = null;
  sendToQueue = jest.fn((_q: string, _b: Buffer, _o: object, cb: (e: Error | null) => void) => {
    cb(this.confirmError);
    return true;
  });
}
class FakeConnection extends EventEmitter {
  confirm = new FakeChannel();
  channels: FakeChannel[] = [];
  close = jest.fn(async () => undefined);
  createConfirmChannel = jest.fn(async () => this.confirm);
  createChannel = jest.fn(async () => {
    const channel = new FakeChannel();
    this.channels.push(channel);
    return channel;
  });
}

let connections: FakeConnection[];
const dest = (address: string, delays: Array<{ label: string; delayMs: number }> = []): ProviderDestination => ({ name: address, address, delays });
const make = (options: Record<string, unknown> = {}, reconnectDelayMs = 1000) =>
  new RabbitMqMessageBusProvider({ options: { amqpConnection: URL, ...options }, getLog, reconnectDelayMs });
const events = () => ({ onConnected: jest.fn(), onDisconnected: jest.fn() });
const msg = (obj: unknown) => ({ content: Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)) });

describe('rabbitmq provider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    save.mockClear();
    connections = [];
    connectMock.mockReset();
    connectMock.mockImplementation(async () => {
      const connection = new FakeConnection();
      connections.push(connection);
      return connection;
    });
  });
  afterEach(() => jest.useRealTimers());

  describe('connection', () => {
    it('builds the url', async () => {
      await make().connect(events());
      await make({ amqpConnectionParams: { heartbeat: 300 } }).connect(events());
      await make({ amqpConnection: 'amqp://h?a=b', amqpConnectionParams: { heartbeat: 300, x: true } }).connect(events());
      expect(connectMock.mock.calls.map((c) => c[0])).toEqual([URL, `${URL}?heartbeat=300`, 'amqp://h?a=b&heartbeat=300&x=true']);
    });

    it('rejects without amqpConnection', async () => {
      await expect(make({ amqpConnection: '' }).connect(events())).rejects.toBeInstanceOf(MessageBusConfigError);
      expect(connectMock).not.toHaveBeenCalled();
    });

    it('retries after a failure and never logs the url', async () => {
      connectMock.mockRejectedValueOnce(Object.assign(new Error(`connect ${URL} failed`), { code: 'ECONNREFUSED' }));
      const e = events();
      const promise = make().connect(e);
      await jest.advanceTimersByTimeAsync(999);
      expect(connectMock).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await promise;
      expect(connectMock).toHaveBeenCalledTimes(2);
      expect(e.onConnected).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(
        'message-bus-connection-error',
        { provider: 'rabbitmq', error: { name: 'Error', code: 'ECONNREFUSED' } },
        'error',
      );
      expect(JSON.stringify(save.mock.calls)).not.toContain('p4ssw0rd');
    });

    it('close stops a connect retry loop', async () => {
      connectMock.mockRejectedValue(new Error('x'));
      const provider = make();
      const promise = provider.connect(events());
      await jest.advanceTimersByTimeAsync(10);
      await provider.close();
      await promise;
      const calls = connectMock.mock.calls.length;
      await jest.advanceTimersByTimeAsync(10000);
      expect(connectMock).toHaveBeenCalledTimes(calls);
    });

    it('reconnects once after several close events and bumps the generation', async () => {
      const provider = make();
      const e = events();
      await provider.connect(e);
      expect(provider.generation).toBe(1);
      const [connection] = connections;
      connection.emit('close', new Error('x'));
      connection.confirm.emit('close');
      connection.emit('close');
      expect(e.onDisconnected).toHaveBeenCalledTimes(1);
      expect(save.mock.calls.filter(([ev]) => ev === 'message-bus-reconnecting')).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(1000);
      expect(connections).toHaveLength(2);
      expect(provider.generation).toBe(2);
      expect(e.onConnected).toHaveBeenCalledTimes(2);
      await provider.close();
      connections[1].emit('close');
      await jest.advanceTimersByTimeAsync(5000);
      expect(connections).toHaveLength(2);
    });

    it('a channel close also triggers a reconnect', async () => {
      const provider = make();
      const e = events();
      await provider.connect(e);
      connections[0].confirm.emit('close', new Error('PRECONDITION_FAILED'));
      expect(e.onDisconnected).toHaveBeenCalledTimes(1);
      expect(connections[0].close).toHaveBeenCalled();
    });

    it('logs only errorRef for error events', async () => {
      await make().connect(events());
      connections[0].emit('error', new Error(`boom ${SENTINEL}`));
      expect(JSON.stringify(save.mock.calls)).not.toContain(SENTINEL);
      expect(save).toHaveBeenCalledWith('message-bus-connection-error', { provider: 'rabbitmq', error: { name: 'Error' } }, 'error');
    });

    it('close is idempotent', async () => {
      const provider = make();
      await provider.connect(events());
      await provider.close();
      await provider.close();
      expect(connections[0].close).toHaveBeenCalledTimes(1);
    });
  });

  describe('declare', () => {
    it('declares exactly the legacy queues', async () => {
      const provider = make();
      await provider.connect(events());
      const tiers = Object.entries(MESSAGE_BUS_RETRY_DELAYS).map(([label, delayMs]) => ({ label, delayMs }));
      await provider.declare([
        dest('task', tiers),
        dest('task-delayed-auto-commit', [{ label: '1m', delayMs: 60000 }]),
        dest('task-pdf'),
        dest('manager'),
      ]);
      const arg = (address: string, delayMs: number) => ({
        durable: true,
        arguments: { 'x-dead-letter-exchange': '', 'x-message-ttl': delayMs, 'x-dead-letter-routing-key': address },
      });
      expect(connections[0].confirm.assertQueue.mock.calls).toEqual([
        ['task', { durable: true }],
        ['task-errors-10m', arg('task', 600000)],
        ['task-errors-1h', arg('task', 3600000)],
        ['task-errors-2h', arg('task', 7200000)],
        ['task-errors-8h', arg('task', 28800000)],
        ['task-errors-1d', arg('task', 86400000)],
        ['task-delayed-auto-commit', { durable: true }],
        ['task-delayed-auto-commit-1m', arg('task-delayed-auto-commit', 60000)],
        ['task-pdf', { durable: true }],
        ['manager', { durable: true }],
      ]);
    });

    it('merges queueParams by exact physical name without mutating defaults', async () => {
      const provider = make({
        queueParams: [
          { queueName: 'q', params: { arguments: { 'x-max-length': 5 } } },
          { queueName: 'q-1m', params: { arguments: { 'x-message-ttl': 1 } } },
          { queueName: 'other', params: { durable: false } },
        ],
      });
      await provider.connect(events());
      await provider.declare([dest('q', [{ label: '1m', delayMs: 60000 }]), dest('r')]);
      const calls = connections[0].confirm.assertQueue.mock.calls;
      expect(calls[0]).toEqual(['q', { durable: true, arguments: { 'x-max-length': 5 } }]);
      expect(calls[1][1]).toEqual({
        durable: true,
        arguments: { 'x-dead-letter-exchange': '', 'x-message-ttl': 1, 'x-dead-letter-routing-key': 'q' },
      });
      expect(calls[2]).toEqual(['r', { durable: true }]);
    });
  });

  describe('send', () => {
    it('publishes persistent json to the main queue or the tier queue', async () => {
      const provider = make();
      await provider.connect(events());
      const body = Buffer.from('{}');
      await provider.send(dest('q'), body, { messageId: 'm' });
      await provider.send(dest('q'), body, { messageId: 'm', delay: { delayMs: 1, label: '1m' } });
      const calls = connections[0].confirm.sendToQueue.mock.calls;
      expect(calls[0].slice(0, 3)).toEqual(['q', body, { persistent: true, messageId: 'm', contentType: 'application/json' }]);
      expect(calls[1][0]).toBe('q-1m');
    });

    it('rejects a nack, no connection and a delay without label', async () => {
      const provider = make();
      await expect(provider.send(dest('q'), Buffer.from('{}'), { messageId: 'm' })).rejects.toBeInstanceOf(MessageBusUnavailableError);
      await provider.connect(events());
      connections[0].confirm.confirmError = new Error('nack');
      await expect(provider.send(dest('q'), Buffer.from('{}'), { messageId: 'm' })).rejects.toBeInstanceOf(MessageBusPublishError);
      await expect(provider.send(dest('q'), Buffer.from('{}'), { messageId: 'm', delay: { delayMs: 1 } })).rejects.toBeInstanceOf(
        MessageBusConfigError,
      );
    });

    it('rejects pending confirms when the channel closes', async () => {
      const provider = make();
      await provider.connect(events());
      connections[0].confirm.sendToQueue.mockImplementation(() => true);
      const promise = provider.send(dest('q'), Buffer.from('{}'), { messageId: 'm' });
      connections[0].confirm.emit('close');
      await expect(promise).rejects.toBeInstanceOf(MessageBusUnavailableError);
    });
  });

  describe('consume', () => {
    const setup = async (options: Record<string, unknown> = {}, outcome: any = 'done') => {
      const provider = make(options);
      const e = events();
      await provider.connect(e);
      const handle = jest.fn(async () => outcome);
      await provider.consume(dest('q'), { maxInFlight: 3 }, handle);
      const channel = connections[0].channels[0];
      return { provider, e, handle, channel };
    };
    const flush = () => jest.advanceTimersByTimeAsync(0);

    it('sets prefetch and maps outcomes', async () => {
      for (const [outcome, check] of [
        ['done', (c: FakeChannel, m: unknown) => expect(c.ack).toHaveBeenCalledWith(m)],
        ['redeliver', (c: FakeChannel, m: unknown) => expect(c.nack).toHaveBeenCalledWith(m, false, true)],
        ['discard', (c: FakeChannel, m: unknown) => expect(c.nack).toHaveBeenCalledWith(m, false, false)],
      ] as const) {
        connections = [];
        const { channel } = await setup({}, outcome);
        expect(channel.prefetch).toHaveBeenCalledWith(3);
        expect(channel.consume.mock.calls[0][2]).toEqual({ noAck: false });
        const m = msg({ a: 1 });
        channel.consumer!(m);
        await flush();
        check(channel, m);
      }
    });

    it('treats a rejecting handler as discard', async () => {
      const { channel, handle } = await setup();
      handle.mockRejectedValue(new Error(SENTINEL));
      const m = msg({});
      channel.consumer!(m);
      await flush();
      expect(channel.nack).toHaveBeenCalledWith(m, false, false);
      expect(JSON.stringify(save.mock.calls)).not.toContain(SENTINEL);
    });

    it('ignores a stale settle after a reconnect', async () => {
      const { channel, handle, provider } = await setup();
      let release!: () => void;
      handle.mockImplementation(() => new Promise((resolve) => (release = () => resolve('done' as any))));
      const m = msg({});
      channel.consumer!(m);
      connections[0].emit('close');
      await jest.advanceTimersByTimeAsync(1000);
      expect(provider.generation).toBe(2);
      release();
      await flush();
      expect(channel.ack).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith('message-bus-settle-error', { provider: 'rabbitmq', reason: 'stale' }, 'warn');
    });

    it('a null message triggers a reconnect', async () => {
      const { channel, e } = await setup();
      channel.consumer!(null);
      expect(e.onDisconnected).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1000);
      expect(connections).toHaveLength(2);
    });

    it('cancel does not trigger a reconnect', async () => {
      const provider = make();
      const e = events();
      await provider.connect(e);
      const consumer = await provider.consume(dest('q'), { maxInFlight: 1 }, async () => 'done');
      const channel = connections[0].channels[0];
      channel.close.mockImplementation(async () => {
        channel.emit('close');
      });
      await consumer.cancel();
      expect(channel.cancel).toHaveBeenCalledWith('tag');
      expect(channel.close).toHaveBeenCalled();
      expect(e.onDisconnected).not.toHaveBeenCalled();
    });

    it('acks a duplicate without calling the handler', async () => {
      const store = { get: jest.fn(async () => 'x'), set: jest.fn(async () => 'OK') };
      const { channel, handle } = await setup({ dedup: { isEnabled: true, getStore: () => store } });
      const m = msg({ amqpMessageId: 'id1' });
      channel.consumer!(m);
      await flush();
      expect(handle).not.toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalledWith(m);
    });

    it('never logs the body, even when it is not valid json', async () => {
      const { channel, handle } = await setup({
        dedup: {
          isEnabled: true,
          getStore: () => ({
            get: async () => {
              throw new Error(SENTINEL);
            },
            set: async () => 'OK',
          }),
        },
      });
      handle.mockRejectedValue(new Error(SENTINEL));
      for (const m of [msg({ amqpMessageId: 'i', data: SENTINEL }), msg(`${SENTINEL} {not json`)]) {
        channel.consumer!(m);
        await flush();
      }
      expect(JSON.stringify(save.mock.calls)).not.toContain(SENTINEL);
    });
  });

  it('is the default provider of createMessageBus', async () => {
    const bus = createMessageBus({ destinations: { a: { address: 'qa' } }, getLog, providerOptions: { amqpConnection: URL } });
    await bus.init();
    expect(connectMock).toHaveBeenCalledWith(URL);
    await bus.close();
  });
});
