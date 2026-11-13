import { MESSAGE_BUS_RETRY_DELAYS } from '@liquio/back-core';

import { setAppContext } from './context';
import { createEventMessageBus, legacyDedupOptions, recordHandlerFailure } from './message_bus';

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

describe('createEventMessageBus', () => {
  const baseConfig = () => ({
    message_queue: { provider: 'memory', readingQueueName: 'in-q', writingQueueName: 'out-q', retryConnectionTime: 1234 },
    redis: { amqpMessageCache: { isEnabled: true, ttl: 55, wipTtl: 66 } },
  });
  const options = () => mockCreateMessageBus.mock.calls[0][0];

  beforeEach(() => {
    mockCreateMessageBus.mockReset();
    mockCreateMessageBus.mockReturnValue({});
  });

  it('maps destinations, retry tiers, provider and reconnect delay, with a log context on each destination', () => {
    createEventMessageBus(baseConfig());
    expect(options().provider).toBe('memory');
    expect(options().reconnectDelayMs).toBe(1234);
    expect(options().destinations.event.address).toBe('in-q');
    expect(options().destinations.event.delays).toEqual(MESSAGE_BUS_RETRY_DELAYS);
    expect(options().destinations.manager.address).toBe('out-q');
    expect(options().destinations.manager.delays).toBeUndefined();
    expect(typeof options().destinations.event.logContext).toBe('function');
    expect(typeof options().destinations.manager.logContext).toBe('function');
  });

  it('uses the legacy dedup options when message_queue.dedup is absent', () => {
    createEventMessageBus(baseConfig());
    const dedup = options().providerOptions.dedup;
    expect(dedup.isEnabled).toBe(true);
    expect(dedup.ttl).toBe(55);
    expect(dedup.inProgress).toEqual({ isEnabled: true, ttl: 66, waitMs: 300000 });
  });

  it('uses message_queue.dedup as is when present', () => {
    const config: any = baseConfig();
    config.message_queue.dedup = { isEnabled: false, ttl: 1 };
    createEventMessageBus(config);
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
    const result = await recordHandlerFailure({ destination: 'event', messageId: 'm1', payload, failure: 'threw', error: new Error('boom') });
    expect(result).toEqual({ errorId: 77 });
    expect(mockCreateRow).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'boom', failure: 'threw', destination: 'event', messageId: 'm1', queueMessage: payload }),
      'error',
      { workflowId: null },
    );
  });
});
