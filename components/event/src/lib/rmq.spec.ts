import { Rmq } from './rmq';

jest.mock('./context', () => ({
  getLog: () => ({ save: jest.fn() }),
  getRedisClient: () => undefined,
}));

describe('Rmq.getIncomingMessageById', () => {
  const makeRmq = (): any => {
    const rmq: any = Object.create(Rmq.prototype);
    rmq.options = { getIncomingMessageInterval: 10, getIncomingMessageTimeout: 1000 };
    rmq.incomingMessages = new Map();
    return rmq;
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves on a stored message and leaves no pending timer', async () => {
    const rmq = makeRmq();
    rmq.incomingMessages.set('id', { payload: { uuid: 'id' } });
    const promise = rmq.getIncomingMessageById('id');
    await jest.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toEqual({ payload: { uuid: 'id' } });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects on timeout', async () => {
    const rmq = makeRmq();
    const promise = rmq.getIncomingMessageById('missing');
    const assertion = expect(promise).rejects.toThrow('Cant get message by ID during timeout.');
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('Rmq connection handlers', () => {
  const makeRmq = (connection: any): any => {
    const rmq: any = Object.create(Rmq.prototype);
    rmq.options = { amqpConnection: 'amqp://localhost' };
    rmq.initialized = true;
    rmq.connection = connection;
    return rmq;
  };

  it('createNewChannel resets initialized on channel error and close', async () => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const channel = { on: (event: string, cb: any) => (handlers[event] = cb) };
    const rmq = makeRmq({ createChannel: (cb: any) => cb(null, channel) });

    await expect(rmq.createNewChannel()).resolves.toBe(channel);
    handlers.error(new Error('boom'));
    expect(rmq.initialized).toBe(false);
    rmq.initialized = true;
    handlers.close();
    expect(rmq.initialized).toBe(false);
  });

  it('createNewChannel rejects when channel creation fails', async () => {
    const rmq = makeRmq({ createChannel: (cb: any) => cb(new Error('nope')) });
    await expect(rmq.createNewChannel()).rejects.toThrow('nope');
    expect(rmq.initialized).toBe(false);
  });

  it('produce publishes with correlation id, replyTo and persistent flag', async () => {
    const publish = jest.fn();
    const rmq = makeRmq({});
    rmq.options = { writingExchangeName: 'ex', writingQueueName: 'q', persistent: true, replyTo: 'r' };
    rmq.channels = { writing: { publish } };
    await expect(rmq.produce({ payload: { uuid: 'u1' } }, false)).resolves.toBe(true);
    expect(publish).toHaveBeenCalledWith('ex', 'q', expect.any(Buffer), { persistent: true, correlationId: 'u1', replyTo: 'r' });
  });

  it('produce rethrows publish errors', async () => {
    const rmq = makeRmq({});
    rmq.options = { writingExchangeName: 'ex', writingQueueName: 'q' };
    rmq.channels = {
      writing: {
        publish: () => {
          throw new Error('publish failed');
        },
      },
    };
    await expect(rmq.produce({ payload: { uuid: 'u1' } })).rejects.toThrow('publish failed');
  });

  it('close resolves even when connection close fails', async () => {
    const rmq = makeRmq({ close: (cb: any) => cb(new Error('x')) });
    await expect(rmq.close()).resolves.toBeUndefined();
  });
});
