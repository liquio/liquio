const constructorSpy = jest.fn();
const mockMethods = {
  createKey: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  getOrSet: jest.fn(),
  getOrSetWithTimestamp: jest.fn(),
};

class BackCoreRedisClientMock {
  config: any;
  constructor(config: any) {
    constructorSpy(config);
    this.config = config;
  }
}
Object.assign(BackCoreRedisClientMock.prototype, mockMethods);

jest.mock('@liquio/back-core', () => ({ RedisClient: BackCoreRedisClientMock }));

import { RedisClient } from './redis_client';

describe('RedisClient (task wrapper)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RedisClient as any).singleton = undefined;
    global.log = { save: jest.fn() } as any;
  });

  it('configures the back-core client with this component prefix and getLog', () => {
    new RedisClient({ host: 'localhost', port: 6379 });

    expect(constructorSpy).toHaveBeenCalledWith(expect.objectContaining({ host: 'localhost', port: 6379, prefix: RedisClient.prefix }));
    const config = constructorSpy.mock.calls[0][0];
    expect(config.getLog()).toBe(global.log);
  });

  it('is a singleton across constructions (later configs are ignored, matching prior behavior)', () => {
    const instance1 = new RedisClient({ host: 'localhost', port: 6379 });
    const instance2 = new RedisClient({ host: 'other-host', port: 1234 });

    expect(instance1).toBe(instance2);
    expect(constructorSpy).toHaveBeenCalledTimes(1);
  });

  it('getInstance returns the singleton', () => {
    const instance = new RedisClient({ host: 'localhost', port: 6379 });
    expect(RedisClient.getInstance()).toBe(instance);
  });

  describe('static passthroughs', () => {
    it('createKey delegates to the singleton', () => {
      new RedisClient({ host: 'localhost', port: 6379 });
      mockMethods.createKey.mockReturnValue('key');

      expect(RedisClient.createKey('a', 'b')).toBe('key');
      expect(mockMethods.createKey).toHaveBeenCalledWith('a', 'b');
    });

    it('getOrSet delegates to the singleton', async () => {
      new RedisClient({ host: 'localhost', port: 6379 });
      mockMethods.getOrSet.mockResolvedValue({ data: 1, isFromCache: true });
      const fn = jest.fn();

      expect(await RedisClient.getOrSet('key', fn, 60)).toEqual({ data: 1, isFromCache: true });
      expect(mockMethods.getOrSet).toHaveBeenCalledWith('key', fn, 60);
    });

    it('getOrSet falls back to calling fn directly when there is no singleton yet', async () => {
      const fn = jest.fn().mockResolvedValue('fresh');

      expect(await RedisClient.getOrSet('key', fn)).toEqual({ data: 'fresh', isFromCache: false });
    });

    it('getOrSetWithTimestamp delegates to the singleton', async () => {
      new RedisClient({ host: 'localhost', port: 6379 });
      mockMethods.getOrSetWithTimestamp.mockResolvedValue({ data: 1, isFromCache: false });
      const timeFn = jest.fn();
      const setFn = jest.fn();

      expect(await RedisClient.getOrSetWithTimestamp('key', timeFn, setFn, 60)).toEqual({ data: 1, isFromCache: false });
      expect(mockMethods.getOrSetWithTimestamp).toHaveBeenCalledWith('key', timeFn, setFn, 60);
    });

    it('getOrSetWithTimestamp falls back to calling setFn directly when there is no singleton yet', async () => {
      const setFn = jest.fn().mockResolvedValue('fresh');

      expect(await RedisClient.getOrSetWithTimestamp('key', jest.fn(), setFn)).toEqual({ data: 'fresh', isFromCache: false });
    });
  });

  it('instance deleteMany/delete are inherited from back-core unchanged', async () => {
    const instance = new RedisClient({ host: 'localhost', port: 6379 });
    mockMethods.deleteMany.mockResolvedValue(2);

    expect(await instance.deleteMany('pattern.*')).toBe(2);
    expect(mockMethods.deleteMany).toHaveBeenCalledWith('pattern.*');
  });
});
