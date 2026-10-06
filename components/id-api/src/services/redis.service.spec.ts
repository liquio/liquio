const constructorSpy = jest.fn();
const mockMethods = {
  connect: jest.fn(),
  close: jest.fn(),
  createKey: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  getOrSet: jest.fn(),
  getOrSetWithTimestamp: jest.fn(),
  increment: jest.fn(),
};

class BackCoreRedisClientMock {
  config: any;
  isEnabled = true;
  constructor(config: any) {
    constructorSpy(config);
    this.config = config;
  }
}
Object.assign(BackCoreRedisClientMock.prototype, mockMethods);

jest.mock('@liquio/back-core', () => ({ RedisClient: BackCoreRedisClientMock }));

const mockLog = { save: jest.fn() };
jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    log = mockLog;
    constructor(config: any) {
      this.config = config;
    }
  },
}));

import { RedisService, DEFAULT_TTL_IN_SECONDS, DEFAULT_PREFIX } from './redis.service';

describe('RedisService', () => {
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      redis: {
        isEnabled: true,
        host: 'localhost',
        port: 6379,
        prefix: 'test-id',
      },
    };
  });

  describe('constructor', () => {
    it('creates a back-core RedisClient with defaults filled in', () => {
      new RedisService(mockConfig, {} as any, {} as any);

      expect(constructorSpy).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        defaultTtl: DEFAULT_TTL_IN_SECONDS,
        prefix: 'test-id',
        getLog: expect.any(Function),
      });
    });

    it('applies configured defaultTtl and default prefix', () => {
      mockConfig.redis = { isEnabled: true, host: 'localhost', port: 6379, defaultTtl: 120 };
      new RedisService(mockConfig, {} as any, {} as any);

      expect(constructorSpy).toHaveBeenCalledWith(expect.objectContaining({ defaultTtl: 120, prefix: DEFAULT_PREFIX }));
    });

    it('resolves getLog to this.log', () => {
      new RedisService(mockConfig, {} as any, {} as any);

      const config = constructorSpy.mock.calls[0][0];
      expect(config.getLog()).toBe(mockLog);
    });

    it('does not create a client when disabled', () => {
      mockConfig.redis = { isEnabled: false };
      const service = new RedisService(mockConfig, {} as any, {} as any);

      expect(constructorSpy).not.toHaveBeenCalled();
      expect(service.isEnabled).toBe(false);
    });

    it('does not create a client when host/port are missing', () => {
      mockConfig.redis = { isEnabled: true };
      const service = new RedisService(mockConfig, {} as any, {} as any);

      expect(constructorSpy).not.toHaveBeenCalled();
      expect(service.isEnabled).toBe(false);
    });
  });

  describe('init / stop', () => {
    it('connects and closes the underlying client when enabled', async () => {
      const service = new RedisService(mockConfig, {} as any, {} as any);

      await service.init();
      await service.stop();

      expect(mockMethods.connect).toHaveBeenCalled();
      expect(mockMethods.close).toHaveBeenCalled();
    });

    it('is a no-op when disabled', async () => {
      mockConfig.redis = { isEnabled: false };
      const service = new RedisService(mockConfig, {} as any, {} as any);

      await expect(service.init()).resolves.toBeUndefined();
      await expect(service.stop()).resolves.toBeUndefined();
      expect(mockMethods.connect).not.toHaveBeenCalled();
    });
  });

  describe('delegation to the back-core client', () => {
    let service: RedisService;

    beforeEach(() => {
      service = new RedisService(mockConfig, {} as any, {} as any);
    });

    it('createKey delegates', () => {
      mockMethods.createKey.mockReturnValue('key');
      expect(service.createKey('a', 'b')).toBe('key');
      expect(mockMethods.createKey).toHaveBeenCalledWith('a', 'b');
    });

    it('get/set/delete delegate', async () => {
      mockMethods.set.mockResolvedValue('OK');
      mockMethods.get.mockResolvedValue('value');
      mockMethods.delete.mockResolvedValue(1);

      expect(await service.set('key', 'value', 60)).toBe('OK');
      expect(await service.get('key')).toBe('value');
      expect(await service.delete('key')).toBe(1);
      expect(mockMethods.set).toHaveBeenCalledWith('key', 'value', 60);
    });

    it('increment delegates', async () => {
      mockMethods.increment.mockResolvedValue(5);
      expect(await service.increment('key', 1, 30)).toBe(5);
      expect(mockMethods.increment).toHaveBeenCalledWith('key', 1, 30);
    });

    it('getOrSet delegates', async () => {
      mockMethods.getOrSet.mockResolvedValue({ data: 1, isFromCache: true });
      const fn = jest.fn();
      expect(await service.getOrSet('key', fn, 60)).toEqual({ data: 1, isFromCache: true });
      expect(mockMethods.getOrSet).toHaveBeenCalledWith('key', fn, 60);
    });

    it('getOrSetWithTimestamp delegates', async () => {
      mockMethods.getOrSetWithTimestamp.mockResolvedValue({ data: 1, isFromCache: false });
      const timeFn = jest.fn();
      const setFn = jest.fn();
      expect(await service.getOrSetWithTimestamp('key', timeFn, setFn, 60)).toEqual({ data: 1, isFromCache: false });
      expect(mockMethods.getOrSetWithTimestamp).toHaveBeenCalledWith('key', timeFn, setFn, 60);
    });
  });

  describe('when disabled', () => {
    let service: RedisService;

    beforeEach(() => {
      mockConfig.redis = { isEnabled: false };
      service = new RedisService(mockConfig, {} as any, {} as any);
    });

    it('createKey falls back to joining args', () => {
      expect(service.createKey('a', 'b')).toBe('a.b');
    });

    it('get/set/delete return safe defaults', async () => {
      expect(await service.set('key', 'value')).toBeNull();
      expect(await service.get('key')).toBeNull();
      expect(await service.delete('key')).toBe(0);
    });

    it('increment returns 0', async () => {
      expect(await service.increment('key', 1)).toBe(0);
    });

    it('getOrSet calls fn directly without caching', async () => {
      const fn = jest.fn().mockResolvedValue('fresh');
      expect(await service.getOrSet('key', fn)).toEqual({ data: 'fresh', isFromCache: false });
    });

    it('getOrSetWithTimestamp calls setFn directly without caching', async () => {
      const setFn = jest.fn().mockResolvedValue('fresh');
      expect(await service.getOrSetWithTimestamp('key', jest.fn(), setFn)).toEqual({ data: 'fresh', isFromCache: false });
    });
  });

  describe('locks', () => {
    let service: RedisService;
    let raw: { set: jest.Mock; eval: jest.Mock };

    beforeEach(() => {
      service = new RedisService(mockConfig, {} as any, {} as any);
      raw = { set: jest.fn(), eval: jest.fn() };
      (service as any).redisClient.client = raw;
      mockMethods.createKey.mockImplementation((...args: any[]) => ['test-id', ...args].join('.'));
    });

    it('acquireLock sets a prefixed key with NX and a TTL and returns the token', async () => {
      raw.set.mockResolvedValue('OK');

      const token = await service.acquireLock('ldap-sync', 300);

      expect(token).toEqual(expect.any(String));
      expect(raw.set).toHaveBeenCalledWith('test-id.lock.ldap-sync', token, { NX: true, EX: 300 });
    });

    it('acquireLock returns null when the lock is held', async () => {
      raw.set.mockResolvedValue(null);

      expect(await service.acquireLock('ldap-sync', 300)).toBeNull();
    });

    it('acquireLock gives a different token to every holder', async () => {
      raw.set.mockResolvedValue('OK');

      expect(await service.acquireLock('ldap-sync', 300)).not.toBe(await service.acquireLock('ldap-sync', 300));
    });

    it('releaseLock deletes the key only for the matching token', async () => {
      raw.eval.mockResolvedValue(1);

      expect(await service.releaseLock('ldap-sync', 'token-1')).toBe(true);

      const [script, options] = raw.eval.mock.calls[0];
      expect(script).toContain("redis.call('get', KEYS[1]) == ARGV[1]");
      expect(script).toContain("redis.call('del', KEYS[1])");
      expect(options).toEqual({ keys: ['test-id.lock.ldap-sync'], arguments: ['token-1'] });
    });

    it('releaseLock returns false when the lock belongs to someone else', async () => {
      raw.eval.mockResolvedValue(0);

      expect(await service.releaseLock('ldap-sync', 'token-1')).toBe(false);
    });

    it('extendLock extends the TTL only for the matching token', async () => {
      raw.eval.mockResolvedValue(1);

      expect(await service.extendLock('ldap-sync', 'token-1', 300)).toBe(true);

      const [script, options] = raw.eval.mock.calls[0];
      expect(script).toContain("redis.call('expire', KEYS[1], ARGV[2])");
      expect(options).toEqual({ keys: ['test-id.lock.ldap-sync'], arguments: ['token-1', '300'] });
    });

    it('extendLock returns false when the lock has expired', async () => {
      raw.eval.mockResolvedValue(0);

      expect(await service.extendLock('ldap-sync', 'token-1', 300)).toBe(false);
    });

    it('does not lock anything when redis is disabled', async () => {
      mockConfig.redis = { isEnabled: false };
      const disabled = new RedisService(mockConfig, {} as any, {} as any);

      expect(await disabled.acquireLock('ldap-sync', 300)).toBeNull();
      expect(await disabled.releaseLock('ldap-sync', 'token-1')).toBe(false);
      expect(await disabled.extendLock('ldap-sync', 'token-1', 300)).toBe(false);
    });
  });
});
