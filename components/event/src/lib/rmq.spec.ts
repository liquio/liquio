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
