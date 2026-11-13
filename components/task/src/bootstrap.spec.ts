import { BpmnTaskCore } from './bootstrap';
import * as context from './lib/context';

jest.mock('./lib/context', () => ({
  ...jest.requireActual('./lib/context'),
  getRedisClient: jest.fn(),
  getRedisClientCommonBpmn: jest.fn(),
  getLog: jest.fn(() => ({ save: jest.fn() })),
}));

describe('BpmnTaskCore.stop redis cleanup', () => {
  const getRedisClient = context.getRedisClient as jest.Mock;
  const getRedisClientCommonBpmn = context.getRedisClientCommonBpmn as jest.Mock;

  beforeEach(() => {
    getRedisClient.mockReset();
    getRedisClientCommonBpmn.mockReset();
  });

  it('closes a shared client once', async () => {
    const client = { close: jest.fn().mockResolvedValue(undefined) };
    getRedisClient.mockReturnValue(client);
    getRedisClientCommonBpmn.mockReturnValue(client);
    await new BpmnTaskCore().stop();
    expect(client.close).toHaveBeenCalledTimes(1);
  });

  it('closes both clients when they differ', async () => {
    const a = { close: jest.fn().mockResolvedValue(undefined) };
    const b = { close: jest.fn().mockResolvedValue(undefined) };
    getRedisClient.mockReturnValue(a);
    getRedisClientCommonBpmn.mockReturnValue(b);
    await new BpmnTaskCore().stop();
    expect(a.close).toHaveBeenCalledTimes(1);
    expect(b.close).toHaveBeenCalledTimes(1);
  });

  it('does nothing when redis is disabled', async () => {
    await expect(new BpmnTaskCore().stop()).resolves.toBeUndefined();
  });

  it('does not throw when close rejects', async () => {
    const client = { close: jest.fn().mockRejectedValue(new Error('boom')) };
    getRedisClient.mockReturnValue(client);
    await expect(new BpmnTaskCore().stop()).resolves.toBeUndefined();
  });
});
