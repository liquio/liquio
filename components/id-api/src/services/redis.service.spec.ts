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
});
