import { setAppContext } from './context';
import { createGatewayMessageBus, legacyDedupOptions, recordHandlerFailure } from './message_bus';

const mockCreateMessageBus = jest.fn();
const mockCreateRow = jest.fn();

jest.mock('@liquio/back-core', () => ({
  ...jest.requireActual('@liquio/back-core'),
  createMessageBus: (...args: any[]) => mockCreateMessageBus(...args),
}));
jest.mock('../models/workflow_error', () => ({
  WorkflowErrorModel: class {
    create = (...args: any[]) => mockCreateRow(...args);
  },
}));

describe('createGatewayMessageBus', () => {
  const baseConfig = () => ({
    message_queue: { provider: 'memory', readingQueueName: 'in-q', writingQueueName: 'out-q', retryConnectionTime: 1234 },
    redis: { amqpMessageCache: { isEnabled: true, ttl: 55 } },
  });
  const options = () => mockCreateMessageBus.mock.calls[0][0];

  beforeEach(() => {
    mockCreateMessageBus.mockReset();
    mockCreateMessageBus.mockReturnValue({});
  });

  it('maps destinations, provider and reconnect delay, with a log context on each destination', () => {
    createGatewayMessageBus(baseConfig());
    expect(options().provider).toBe('memory');
    expect(options().reconnectDelayMs).toBe(1234);
    expect(options().destinations.gateway.address).toBe('in-q');
    expect(options().destinations.manager.address).toBe('out-q');
    expect(typeof options().destinations.gateway.logContext).toBe('function');
    expect(typeof options().destinations.manager.logContext).toBe('function');
  });

  it('uses the legacy dedup options when message_queue.dedup is absent', () => {
    const config = baseConfig();
    createGatewayMessageBus(config);
    const dedup = options().providerOptions.dedup;
    expect(dedup.isEnabled).toBe(true);
    expect(dedup.ttl).toBe(55);
  });

  it('uses message_queue.dedup as is when present', () => {
    const config: any = baseConfig();
    config.message_queue.dedup = { isEnabled: false, ttl: 1 };
    createGatewayMessageBus(config);
    expect(options().providerOptions.dedup).toEqual({ isEnabled: false, ttl: 1 });
  });

  it('returns the redis client from getStore only while the legacy flag is enabled', () => {
    const config: any = baseConfig();
    const redisClient = { fake: true };
    setAppContext({ config, redisClient });
    const { getStore } = legacyDedupOptions(config);
    expect(getStore()).toBe(redisClient);
    config.redis.amqpMessageCache.isEnabled = false;
    expect(getStore()).toBeNull();
  });
});

describe('recordHandlerFailure', () => {
  it('records the failure without linking it to the message workflow and returns the row id', async () => {
    mockCreateRow.mockResolvedValue(77);
    const payload = { workflowId: 'w1' };
    const result = await recordHandlerFailure({ destination: 'gateway', messageId: 'm1', payload, failure: 'threw', error: new Error('boom') });
    expect(result).toEqual({ errorId: 77 });
    expect(mockCreateRow).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'boom', failure: 'threw', destination: 'gateway', messageId: 'm1', queueMessage: payload }),
      { workflowId: null },
    );
  });
});
