import { PgPubSub } from './pgpubsub';

const mockClients: any[] = [];

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const client = {
      handlers,
      on: jest.fn((event: string, cb: (...args: any[]) => void) => {
        handlers[event] = cb;
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    };
    mockClients.push(client);
    return client;
  }),
}));

jest.mock('@liquio/back-core', () => ({
  Log: { getInstance: () => ({ save: jest.fn() }) },
}));

const cfg = (database: string) => ({
  username: 'u',
  host: 'h',
  database,
  password: 'p',
  port: 5432,
  retryConnectionTime: 1000,
});

describe('PgPubSub.close', () => {
  const { Client } = jest.requireMock('pg');

  beforeEach(() => {
    mockClients.length = 0;
    Client.mockClear();
  });

  afterEach(async () => {
    await PgPubSub.getInstance()?.close();
    jest.useRealTimers();
  });

  it('ends the client and clears a pending reconnect timer', async () => {
    jest.useFakeTimers();
    const pubsub = new PgPubSub(cfg('db1'));
    await pubsub.connect();
    mockClients[0].end.mockRejectedValueOnce(new Error('end failed'));

    await pubsub.reconnect();
    await pubsub.close();

    expect(mockClients[0].end).toHaveBeenCalled();
    const calls = Client.mock.calls.length;
    await jest.advanceTimersByTimeAsync(30000);
    expect(Client.mock.calls.length).toBe(calls);
  });

  it('does not reconnect on end event after close', async () => {
    const pubsub = new PgPubSub(cfg('db1'));
    await pubsub.connect();
    const spy = jest.spyOn(pubsub, 'reconnect');

    await pubsub.close();
    mockClients[0].handlers.end();

    expect(spy).not.toHaveBeenCalled();
  });

  it('creates a fresh instance with new config after close', async () => {
    const first = new PgPubSub(cfg('db1'));
    await first.close();

    const second = new PgPubSub(cfg('db2'));
    expect(second).not.toBe(first);
    await second.connect();
    expect(Client).toHaveBeenLastCalledWith(expect.objectContaining({ database: 'db2' }));
  });
});
