const constructorSpy = jest.fn();
const mockMethods = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
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

describe('RedisClient (gateway wrapper)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RedisClient as any).singleton = undefined;
    global.log = { save: jest.fn() } as any;
  });

  it('configures the back-core client with getLog', () => {
    new RedisClient({ host: 'localhost', port: 6379, defaultTtl: 60 });

    expect(constructorSpy).toHaveBeenCalledWith(expect.objectContaining({ host: 'localhost', port: 6379, defaultTtl: 60 }));
    const config = constructorSpy.mock.calls[0][0];
    expect(config.getLog()).toBe(global.log);
  });

  it('is a singleton across constructions', () => {
    const instance1 = new RedisClient({ host: 'localhost', port: 6379 });
    const instance2 = new RedisClient({ host: 'localhost', port: 6379 });

    expect(instance1).toBe(instance2);
    expect(constructorSpy).toHaveBeenCalledTimes(1);
  });

  it('inherits get/set/delete from back-core unchanged', async () => {
    const instance = new RedisClient({ host: 'localhost', port: 6379 });
    mockMethods.set.mockResolvedValue('OK');
    mockMethods.get.mockResolvedValue('value');
    mockMethods.delete.mockResolvedValue(1);

    expect(await instance.set('key', 'value')).toBe('OK');
    expect(await instance.get('key')).toBe('value');
    expect(await instance.delete('key')).toBe(1);
  });
});
