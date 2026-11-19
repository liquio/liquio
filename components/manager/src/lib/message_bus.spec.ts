import { MessageBusConfigError } from '@liquio/back-core';

import { setAppContext } from './context';
import {
  buildDestinations,
  createManagerMessageBus,
  legacyDedupOptions,
  recordHandlerFailure,
  resolveEventDestination,
  resolveTrustedWorkflowId,
} from './message_bus';

const mockCreateMessageBus = jest.fn();
const mockCreateRow = jest.fn();
const mockFindTask = jest.fn();
const mockFindGateway = jest.fn();
const mockFindEvent = jest.fn();

jest.mock('@liquio/back-core', () => ({
  ...jest.requireActual('@liquio/back-core'),
  createMessageBus: (...args: any[]) => mockCreateMessageBus(...args),
}));
jest.mock('../models/workflow_error', () => ({
  WorkflowErrorModel: class {
    create = (...args: any[]) => mockCreateRow(...args);
  },
}));
jest.mock('../models/task', () => ({
  TaskModel: class {
    findById = (...a: any[]) => mockFindTask(...a);
  },
}));
jest.mock('../models/gateway', () => ({
  GatewayModel: class {
    findById = (...a: any[]) => mockFindGateway(...a);
  },
}));
jest.mock('../models/event', () => ({
  EventModel: class {
    findById = (...a: any[]) => mockFindEvent(...a);
  },
}));

const mqConfig = () => ({
  readingQueueName: 'in-q',
  writingQueueTask: 'task-q',
  writingQueueEvent: 'event-q',
  writingQueueGateway: 'gateway-q',
  retryConnectionTime: 1234,
});

describe('buildDestinations', () => {
  it('maps the four queues', () => {
    expect(buildDestinations(mqConfig())).toEqual({
      manager: { address: 'in-q' },
      task: { address: 'task-q' },
      event: { address: 'event-q' },
      gateway: { address: 'gateway-q' },
    });
  });

  it('adds a destination per specific event queue', () => {
    const destinations = buildDestinations({ ...mqConfig(), specificWritingQueuesEvent: { special: [1], other: [2] } });
    expect(destinations['event.special']).toEqual({ address: 'event-q-special' });
    expect(destinations['event.other']).toEqual({ address: 'event-q-other' });
  });
});

describe('resolveEventDestination', () => {
  const mq = { ...mqConfig(), specificWritingQueuesEvent: { first: ['a', 'b'], second: ['b'] } };

  it('uses the default destination without a template id or a match', () => {
    expect(resolveEventDestination(mq, {})).toBe('event');
    expect(resolveEventDestination(mq, { workflowTemplateId: 'zzz' })).toBe('event');
    expect(resolveEventDestination(mqConfig(), { workflowTemplateId: 'a' })).toBe('event');
  });

  it('uses the specific destination on a single match', () => {
    expect(resolveEventDestination(mq, { workflowTemplateId: 'a' })).toBe('event.first');
  });

  it('lets the last matching key win', () => {
    expect(resolveEventDestination(mq, { workflowTemplateId: 'b' })).toBe('event.second');
  });
});

describe('createManagerMessageBus', () => {
  const options = () => mockCreateMessageBus.mock.calls[0][0];

  beforeEach(() => {
    mockCreateMessageBus.mockReset();
    mockCreateMessageBus.mockReturnValue({});
  });

  it('passes provider, reconnect delay and destinations with a log context', () => {
    createManagerMessageBus({ message_queue: { ...mqConfig(), provider: 'memory' } });
    expect(options().provider).toBe('memory');
    expect(options().reconnectDelayMs).toBe(1234);
    expect(options().destinations.manager.address).toBe('in-q');
    expect(typeof options().destinations.event.logContext).toBe('function');
  });

  it('uses the legacy dedup options when message_queue.dedup is absent', () => {
    createManagerMessageBus({ message_queue: mqConfig(), redis: { amqpMessageCache: { isEnabled: true, ttl: 55 } } });
    expect(options().providerOptions.dedup).toEqual(expect.objectContaining({ isEnabled: true, ttl: 55 }));
  });

  it('passes message_queue.dedup as is when present', () => {
    createManagerMessageBus({ message_queue: { ...mqConfig(), dedup: { isEnabled: false, ttl: 1 } } });
    expect(options().providerOptions.dedup).toEqual({ isEnabled: false, ttl: 1 });
  });

  it('returns the redis client from getStore only while the legacy flag is enabled', () => {
    const config: any = { redis: { amqpMessageCache: { isEnabled: true } } };
    const redisClient = { fake: true };
    setAppContext({ config, redisClient });
    const { getStore } = legacyDedupOptions(config);
    expect(getStore()).toBe(redisClient);
    config.redis.amqpMessageCache.isEnabled = false;
    expect(getStore()).toBeNull();
  });
});

describe('createManagerMessageBus with an invalid specific queue key', () => {
  it('throws MessageBusConfigError', () => {
    const { createMessageBus } = jest.requireActual('@liquio/back-core');
    mockCreateMessageBus.mockImplementation(createMessageBus);
    expect(() =>
      createManagerMessageBus({ message_queue: { ...mqConfig(), provider: 'memory', specificWritingQueuesEvent: { 'bad key!': [1] } } }),
    ).toThrow(MessageBusConfigError);
  });
});

describe('resolveTrustedWorkflowId', () => {
  beforeEach(() => {
    mockFindTask.mockReset();
    mockFindGateway.mockReset();
    mockFindEvent.mockReset();
  });

  it('uses the task entity', async () => {
    mockFindTask.mockResolvedValue({ workflowId: 'wf-task' });
    expect(await resolveTrustedWorkflowId({ taskId: 't', workflowId: 'foreign' })).toBe('wf-task');
  });

  it('uses the gateway entity', async () => {
    mockFindGateway.mockResolvedValue({ workflowId: 'wf-gw' });
    expect(await resolveTrustedWorkflowId({ gatewayId: 'g', workflowId: 'foreign' })).toBe('wf-gw');
  });

  it('uses the event entity', async () => {
    mockFindEvent.mockResolvedValue({ workflowId: 'wf-ev' });
    expect(await resolveTrustedWorkflowId({ eventId: 'e', workflowId: 'foreign' })).toBe('wf-ev');
  });

  it('checks task first', async () => {
    mockFindTask.mockResolvedValue({ workflowId: 'wf-task' });
    expect(await resolveTrustedWorkflowId({ eventId: 'e', taskId: 't' })).toBe('wf-task');
    expect(mockFindEvent).not.toHaveBeenCalled();
  });

  it('returns null without a key, without an entity, or when the lookup throws', async () => {
    expect(await resolveTrustedWorkflowId({ workflowId: 'foreign' })).toBeNull();
    expect(await resolveTrustedWorkflowId(null)).toBeNull();
    mockFindTask.mockResolvedValue(null);
    expect(await resolveTrustedWorkflowId({ taskId: 'missing', workflowId: 'foreign' })).toBeNull();
    mockFindGateway.mockRejectedValue(new Error('db down'));
    expect(await resolveTrustedWorkflowId({ gatewayId: 'g' })).toBeNull();
  });
});

describe('recordHandlerFailure', () => {
  it('records the failure linked by the entity and returns the row id', async () => {
    mockCreateRow.mockResolvedValue(77);
    mockFindTask.mockResolvedValue({ workflowId: 'wf-task' });
    const payload = { taskId: 't', workflowId: 'foreign' };
    const result = await recordHandlerFailure({ destination: 'manager', messageId: 'm1', payload, failure: 'threw', error: new Error('boom') });
    expect(result).toEqual({ errorId: 77 });
    expect(mockCreateRow).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'boom',
        failure: 'threw',
        destination: 'manager',
        messageId: 'm1',
        queueMessage: payload,
        workflowId: 'wf-task',
      }),
    );
  });
});
