import crypto from 'node:crypto';

const mockClient = {
  connect: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  scan: jest.fn(),
  multi: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockClient),
}));

import { createClient } from 'redis';
import { RedisClient, RedisClientConfig, RedisClientLog } from './redis_client';

describe('RedisClient', () => {
  let log: RedisClientLog;
  let getLog: () => RedisClientLog;
  let baseConfig: RedisClientConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.quit.mockResolvedValue(undefined);
    mockClient.set.mockResolvedValue('OK');
    mockClient.get.mockResolvedValue(null);
    mockClient.del.mockResolvedValue(0);
    mockClient.keys.mockResolvedValue([]);
    mockClient.scan.mockResolvedValue({ cursor: '0', keys: [] });
    mockClient.multi.mockReturnValue({
      incrBy: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([1, 1]),
    });

    log = { save: jest.fn() };
    getLog = () => log;
    baseConfig = { host: 'localhost', port: 6379, prefix: 'test', getLog };
  });

  describe('constructor / connection', () => {
    it('creates the underlying client with a socket host/port and connects', async () => {
      new RedisClient(baseConfig);

      expect(createClient).toHaveBeenCalledWith({ socket: { host: 'localhost', port: 6379 } });
      await Promise.resolve();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('registers error and ready listeners that log via getLog', () => {
      new RedisClient(baseConfig);

      const errorHandler = mockClient.on.mock.calls.find(([event]) => event === 'error')?.[1];
      const readyHandler = mockClient.on.mock.calls.find(([event]) => event === 'ready')?.[1];

      errorHandler(new Error('boom'));
      expect(log.save).toHaveBeenCalledWith('redis-error', { error: 'boom' }, 'error');

      readyHandler();
      expect(log.save).toHaveBeenCalledWith('redis-connected', expect.any(Object), 'info');
    });

    it('logs the connection failure even if connect() is never awaited', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      new RedisClient(baseConfig);
      await new Promise((resolve) => setImmediate(resolve));

      expect(log.save).toHaveBeenCalledWith('redis-connection-error', { error: 'Connection refused' }, 'error');
    });

    it('rejects an explicit connect() call on failure, so callers can fail fast', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      const instance = new RedisClient(baseConfig);

      await expect(instance.connect()).rejects.toThrow('Can not connect to redis: Error: Connection refused');
    });

    it('connect() is idempotent and does not call the underlying connect twice', async () => {
      const instance = new RedisClient(baseConfig);
      await instance.connect();
      await instance.connect();

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('does not create an underlying client when disabled', () => {
      new RedisClient({ ...baseConfig, isEnabled: false });

      expect(createClient).not.toHaveBeenCalled();
    });

    it('is disabled when host/port are missing', () => {
      const instance = new RedisClient({ host: '', port: 0, getLog } as unknown as RedisClientConfig);

      expect(instance.isEnabled).toBe(false);
      expect(createClient).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('quits the underlying client', async () => {
      const instance = new RedisClient(baseConfig);
      await instance.close();

      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('is a no-op when disabled', async () => {
      const instance = new RedisClient({ ...baseConfig, isEnabled: false });
      await expect(instance.close()).resolves.toBeUndefined();
    });
  });

  describe('createKey', () => {
    it('joins the prefix and arguments with dots', () => {
      const instance = new RedisClient(baseConfig);
      expect(instance.createKey('a', 'b', 1)).toBe('test.a.b.1');
    });

    it('hashes object arguments', () => {
      const instance = new RedisClient(baseConfig);
      const obj = { id: 1 };
      const expectedHash = crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');

      expect(instance.createKey('data', obj)).toBe(`test.data.${expectedHash}`);
    });

    it('handles no arguments and no prefix', () => {
      const instance = new RedisClient({ ...baseConfig, prefix: undefined });
      expect(instance.createKey()).toBe('');
    });
  });

  describe('set / get / delete', () => {
    it('applies the default ttl when none is given', async () => {
      const instance = new RedisClient({ ...baseConfig, defaultTtl: 120 });
      await instance.set('key', 'value');

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 120 });
    });

    it('falls back to the 300s default ttl when none is configured', async () => {
      const instance = new RedisClient(baseConfig);
      await instance.set('key', 'value');

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
    });

    it('uses an explicit ttl over the default', async () => {
      const instance = new RedisClient(baseConfig);
      await instance.set('key', 'value', 60);

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value', { EX: 60 });
    });

    it('stringifies object data', async () => {
      const instance = new RedisClient(baseConfig);
      const obj = { id: 1, value: null };
      await instance.set('key', obj);

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj), { EX: 300 });
    });

    it('resolves array keys through createKey', async () => {
      const instance = new RedisClient(baseConfig);
      await instance.set(['a', 'b'], 'value');
      await instance.get(['a', 'b']);
      await instance.delete(['a', 'b']);

      expect(mockClient.set).toHaveBeenCalledWith('test.a.b', 'value', { EX: 300 });
      expect(mockClient.get).toHaveBeenCalledWith('test.a.b');
      expect(mockClient.del).toHaveBeenCalledWith('test.a.b');
    });

    it('get/set/delete are safe no-ops when disabled', async () => {
      const instance = new RedisClient({ ...baseConfig, isEnabled: false });

      expect(await instance.set('key', 'value')).toBeNull();
      expect(await instance.get('key')).toBeNull();
      expect(await instance.delete('key')).toBe(0);
      expect(mockClient.set).not.toHaveBeenCalled();
    });
  });

  describe('getObject', () => {
    it('parses JSON data', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ id: 1 }));
      const instance = new RedisClient(baseConfig);

      expect(await instance.getObject('key')).toEqual({ id: 1 });
    });

    it('returns null when the key is missing', async () => {
      mockClient.get.mockResolvedValue(null);
      const instance = new RedisClient(baseConfig);

      expect(await instance.getObject('key')).toBeNull();
    });

    it('logs and rethrows on invalid JSON', async () => {
      mockClient.get.mockResolvedValue('not-json');
      const instance = new RedisClient(baseConfig);

      await expect(instance.getObject('key')).rejects.toThrow();
      expect(log.save).toHaveBeenCalledWith('redis-parse-object-error', expect.objectContaining({ key: 'key', data: 'not-json' }), 'error');
    });
  });

  describe('getKeys / scan / deleteMany', () => {
    it('getKeys resolves pattern through createKey', async () => {
      const instance = new RedisClient(baseConfig);
      await instance.getKeys(['a', '*']);

      expect(mockClient.keys).toHaveBeenCalledWith('test.a.*');
    });

    it('scan normalizes the cursor to a number', async () => {
      mockClient.scan.mockResolvedValue({ cursor: '12', keys: ['k1'] });
      const instance = new RedisClient(baseConfig);

      expect(await instance.scan(0, 'k*', 5)).toEqual({ cursor: 12, keys: ['k1'] });
      expect(mockClient.scan).toHaveBeenCalledWith(0, { MATCH: 'k*', COUNT: 5 });
    });

    it('deleteMany deletes all keys matching the pattern', async () => {
      mockClient.keys.mockResolvedValue(['k1', 'k2']);
      mockClient.del.mockResolvedValue(2);
      const instance = new RedisClient(baseConfig);

      expect(await instance.deleteMany('k*')).toBe(2);
      expect(mockClient.del).toHaveBeenCalledWith(['k1', 'k2']);
    });

    it('deleteMany returns 0 without calling del when there are no matches', async () => {
      mockClient.keys.mockResolvedValue([]);
      const instance = new RedisClient(baseConfig);

      expect(await instance.deleteMany('k*')).toBe(0);
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('getKeys / scan / deleteMany are safe no-ops when disabled', async () => {
      const instance = new RedisClient({ ...baseConfig, isEnabled: false });

      expect(await instance.getKeys('k*')).toEqual([]);
      expect(await instance.scan(0, 'k*')).toEqual({ cursor: 0, keys: [] });
      expect(await instance.deleteMany('k*')).toBe(0);
    });
  });

  describe('increment', () => {
    it('increments and resets the ttl in a single multi call', async () => {
      const multiChain = { incrBy: jest.fn().mockReturnThis(), expire: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([7, 1]) };
      mockClient.multi.mockReturnValue(multiChain);

      const instance = new RedisClient(baseConfig);
      const result = await instance.increment('counter', 3, 60);

      expect(multiChain.incrBy).toHaveBeenCalledWith('counter', 3);
      expect(multiChain.expire).toHaveBeenCalledWith('counter', 60);
      expect(result).toBe(7);
    });

    it('returns 0 when disabled', async () => {
      const instance = new RedisClient({ ...baseConfig, isEnabled: false });
      expect(await instance.increment('counter', 1)).toBe(0);
    });

    it('returns 0 when exec does not return an array', async () => {
      mockClient.multi.mockReturnValue({
        incrBy: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });
      const instance = new RedisClient(baseConfig);

      expect(await instance.increment('counter', 1)).toBe(0);
    });
  });

  describe('getOrSet', () => {
    it('returns cached data on a hit without calling fn', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ id: 1 }));
      const instance = new RedisClient(baseConfig);
      const fn = jest.fn();

      expect(await instance.getOrSet('key', fn)).toEqual({ data: { id: 1 }, isFromCache: true });
      expect(fn).not.toHaveBeenCalled();
    });

    it('calls fn and caches the result on a miss', async () => {
      mockClient.get.mockResolvedValue(null);
      const instance = new RedisClient(baseConfig);
      const fn = jest.fn().mockResolvedValue({ id: 2 });

      expect(await instance.getOrSet('key', fn, 60)).toEqual({ data: { id: 2 }, isFromCache: false });
      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify({ id: 2 }), { EX: 60 });
    });

    it('always calls fn and never caches when disabled', async () => {
      const instance = new RedisClient({ ...baseConfig, isEnabled: false });
      const fn = jest.fn().mockResolvedValue({ id: 3 });

      expect(await instance.getOrSet('key', fn)).toEqual({ data: { id: 3 }, isFromCache: false });
      expect(mockClient.set).not.toHaveBeenCalled();
    });
  });

  describe('getOrSetWithTimestamp', () => {
    it('sets fresh data when there is no cached timestamp', async () => {
      mockClient.get.mockResolvedValue(null);
      const instance = new RedisClient(baseConfig);
      const timeFn = jest.fn().mockResolvedValue('2024-01-02');
      const setFn = jest.fn().mockResolvedValue({ id: 1 });

      const result = await instance.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(result).toEqual({ data: { id: 1 }, isFromCache: false });
      expect(mockClient.del).toHaveBeenCalledWith('key');
    });

    it('invalidates the cache when the new timestamp is newer', async () => {
      const instance = new RedisClient(baseConfig);
      mockClient.get.mockImplementation((key: string) =>
        key.endsWith('.timestamp') ? Promise.resolve(JSON.stringify('2024-01-01')) : Promise.resolve(null),
      );
      const timeFn = jest.fn().mockResolvedValue('2024-01-02');
      const setFn = jest.fn().mockResolvedValue({ id: 1 });

      await instance.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(mockClient.del).toHaveBeenCalledWith('key');
    });

    it('keeps the cache when the timestamp has not advanced', async () => {
      const instance = new RedisClient(baseConfig);
      mockClient.get.mockImplementation((key: string) =>
        key.endsWith('.timestamp') ? Promise.resolve(JSON.stringify('2024-01-02')) : Promise.resolve(JSON.stringify({ id: 1 })),
      );
      const timeFn = jest.fn().mockResolvedValue('2024-01-01');
      const setFn = jest.fn();

      const result = await instance.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(mockClient.del).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { id: 1 }, isFromCache: true });
      expect(setFn).not.toHaveBeenCalled();
    });

    it('calls setFn directly without touching redis when disabled', async () => {
      const instance = new RedisClient({ ...baseConfig, isEnabled: false });
      const timeFn = jest.fn();
      const setFn = jest.fn().mockResolvedValue({ id: 1 });

      const result = await instance.getOrSetWithTimestamp('key', timeFn, setFn);

      expect(result).toEqual({ data: { id: 1 }, isFromCache: false });
      expect(timeFn).not.toHaveBeenCalled();
    });
  });
});
