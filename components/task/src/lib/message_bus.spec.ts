import { MESSAGE_BUS_RETRY_DELAYS, registerMessageBusProvider } from '@liquio/back-core';

import { setAppContext, resetAppContext } from './context';
import {
  createTaskMessageBus,
  delayedAutoCommitTiers,
  isPdfReadingEnabled,
  legacyDedupOptions,
  publishOrLog,
  recordHandlerFailure,
  resolveTrustedWorkflowId,
  GENERATING_PDF_QUEUE_NAME,
} from './message_bus';

const mockCreateMessageBus = jest.fn();

jest.mock('@liquio/back-core', () => ({
  ...jest.requireActual('@liquio/back-core'),
  createMessageBus: (...args: any[]) => mockCreateMessageBus(...args),
}));

describe('createTaskMessageBus', () => {
  const baseConfig = (): any => ({
    message_queue: { provider: 'memory', readingQueueName: 'in-q', writingQueueName: 'out-q', retryConnectionTime: 1234 },
    redis: { redisCommonBpmn: { amqpMessageCache: { isEnabled: true, ttl: 55 } } },
  });
  const options = () => mockCreateMessageBus.mock.calls[0][0];

  beforeEach(() => {
    mockCreateMessageBus.mockReset();
    mockCreateMessageBus.mockReturnValue({});
  });

  afterEach(() => {
    resetAppContext();
  });

  it('maps destinations, retry tiers, provider and reconnect delay, with a log context on each destination', () => {
    createTaskMessageBus(baseConfig());
    expect(options().provider).toBe('memory');
    expect(options().reconnectDelayMs).toBe(1234);
    expect(options().destinations.task.address).toBe('in-q');
    expect(options().destinations.task.delays).toEqual(MESSAGE_BUS_RETRY_DELAYS);
    expect(options().destinations.manager.address).toBe('out-q');
    expect(options().destinations['task-pdf'].address).toBe(GENERATING_PDF_QUEUE_NAME);
    for (const name of ['task', 'manager', 'task-pdf']) {
      expect(typeof options().destinations[name].logContext).toBe('function');
    }
  });

  it('connects in the background and retries a failed publish once after a minute', () => {
    createTaskMessageBus(baseConfig());
    expect(options().connectInBackground).toBe(true);
    expect(options().publishRetry).toEqual({ attempts: 1, delayMs: 60000 });
  });

  it('reports connecting until the broker is reachable, then connected', async () => {
    let connect!: () => void;
    registerMessageBusProvider('stub-late-broker', () => ({
      name: 'stub-late-broker',
      capabilities: { arbitraryDelay: false },
      connect: (events: any) =>
        new Promise<void>((resolve) => {
          connect = () => {
            events.onConnected();
            resolve();
          };
        }),
      declare: async () => undefined,
      send: async () => undefined,
      consume: async () => ({ cancel: async () => undefined }),
      close: async () => undefined,
    }));
    mockCreateMessageBus.mockImplementation(jest.requireActual('@liquio/back-core').createMessageBus);
    setAppContext({ log: { save: jest.fn() } as any });
    const config = baseConfig();
    config.message_queue.provider = 'stub-late-broker';
    const bus = createTaskMessageBus(config);
    await bus.init();
    expect(bus.health().status).toBe('connecting');
    connect();
    await new Promise((resolve) => setImmediate(resolve));
    expect(bus.health().status).toBe('connected');
  });

  it('declares the delayed auto commit destination only when tiers are configured', () => {
    createTaskMessageBus(baseConfig());
    expect(options().destinations['task-delayed-auto-commit']).toBeUndefined();

    mockCreateMessageBus.mockClear();
    const config = baseConfig();
    config.message_queue.delayedAutoCommitQueues = { '1s': 1, '1m': 60 };
    createTaskMessageBus(config);
    expect(options().destinations['task-delayed-auto-commit'].address).toBe('in-q-delayed-auto-commit');
    expect(options().destinations['task-delayed-auto-commit'].delays).toEqual({ '1s': 1000, '1m': 60000 });
  });

  it('uses the legacy dedup options when message_queue.dedup is absent', () => {
    createTaskMessageBus(baseConfig());
    const dedup = options().providerOptions.dedup;
    expect(dedup.isEnabled).toBe(true);
    expect(dedup.ttl).toBe(55);
  });

  it('uses message_queue.dedup as is when present', () => {
    const config = baseConfig();
    config.message_queue.dedup = { isEnabled: false, ttl: 1 };
    createTaskMessageBus(config);
    expect(options().providerOptions.dedup).toEqual({ isEnabled: false, ttl: 1 });
  });

  it('returns the common BPMN redis client from getStore only while the legacy flag is enabled', () => {
    const config = baseConfig();
    const redisClientCommonBpmn = { fake: true };
    setAppContext({ config, redisClientCommonBpmn });
    const { getStore } = legacyDedupOptions(config);
    expect(getStore()).toBe(redisClientCommonBpmn);
    config.redis.redisCommonBpmn.amqpMessageCache.isEnabled = false;
    expect(getStore()).toBeNull();
  });
});

describe('delayedAutoCommitTiers', () => {
  it('converts seconds to milliseconds', () => {
    expect(delayedAutoCommitTiers({ delayedAutoCommitQueues: { '1s': 1, '1h': '3600' } })).toEqual({ '1s': 1000, '1h': 3600000 });
    expect(delayedAutoCommitTiers({})).toEqual({});
  });
});

describe('isPdfReadingEnabled', () => {
  it.each([
    [undefined, true],
    [true, true],
    [false, false],
    ['true', false],
  ])('treats %p as %p', (value, expected) => {
    expect(isPdfReadingEnabled({ enabledReadingGeneratingPdfMessages: value })).toBe(expected);
  });
});

describe('publishOrLog', () => {
  const save = jest.fn();
  const publish = jest.fn();

  beforeEach(() => {
    save.mockReset();
    publish.mockReset();
    setAppContext({ log: { save } as any, messageBus: { publish } as any });
  });

  afterEach(() => {
    resetAppContext();
  });

  it('passes options only when given and returns true', async () => {
    publish.mockResolvedValue({ messageId: 'x' });
    await expect(publishOrLog('manager', { a: 1 })).resolves.toBe(true);
    expect(publish).toHaveBeenLastCalledWith('manager', { a: 1 });
    await expect(publishOrLog('task', { a: 1 }, { delayMs: 5 })).resolves.toBe(true);
    expect(publish).toHaveBeenLastCalledWith('task', { a: 1 }, { delayMs: 5 });
  });

  it('returns false and logs without the payload or the error message when publish rejects', async () => {
    publish.mockRejectedValue(new Error('SENTINEL-MSG'));
    await expect(publishOrLog('task-pdf', { documentId: 'd1', userId: 'SENTINEL-U' })).resolves.toBe(false);
    expect(save).toHaveBeenCalledWith('message-bus-publish-failed', expect.objectContaining({ destination: 'task-pdf', documentId: 'd1' }), 'error');
    expect(JSON.stringify(save.mock.calls)).not.toContain('SENTINEL-MSG');
  });
});

describe('resolveTrustedWorkflowId', () => {
  const findById = jest.fn();
  const findByDocumentId = jest.fn();

  beforeEach(() => {
    findById.mockReset();
    findByDocumentId.mockReset();
    setAppContext({ models: { task: { findById, findByDocumentId } } as any });
  });

  afterEach(() => {
    resetAppContext();
  });

  it('links an auto commit message through its task and a PDF message through its document task', async () => {
    findById.mockResolvedValue({ workflowId: 'w-task' });
    findByDocumentId.mockResolvedValue({ workflowId: 'w-doc' });
    await expect(resolveTrustedWorkflowId('task-delayed-auto-commit', { taskId: 't', workflowId: 'planted' })).resolves.toBe('w-task');
    await expect(resolveTrustedWorkflowId('task-pdf', { documentId: 'd', workflowId: 'planted' })).resolves.toBe('w-doc');
  });

  it('never links the main queue and gives null for unknown entities or failing lookups', async () => {
    await expect(resolveTrustedWorkflowId('task', { workflowId: 'planted' })).resolves.toBeNull();
    findById.mockResolvedValue(undefined);
    await expect(resolveTrustedWorkflowId('task-delayed-auto-commit', { taskId: 'x', workflowId: 'planted' })).resolves.toBeNull();
    findByDocumentId.mockRejectedValue(new Error('db'));
    await expect(resolveTrustedWorkflowId('task-pdf', { documentId: 'x' })).resolves.toBeNull();
  });
});

describe('recordHandlerFailure', () => {
  const create = jest.fn();

  beforeEach(() => {
    create.mockReset();
    setAppContext({ models: { workflowError: { create }, task: { findById: jest.fn().mockResolvedValue({ workflowId: 'w-task' }) } } as any });
  });

  afterEach(() => {
    resetAppContext();
  });

  it('records the failure with the trusted workflow id and returns the row id', async () => {
    create.mockResolvedValue(77);
    const payload = { taskId: 't1', workflowId: 'planted' };
    const result = await recordHandlerFailure({
      destination: 'task-delayed-auto-commit',
      messageId: 'm1',
      payload,
      failure: 'threw',
      error: new Error('boom'),
    });
    expect(result).toEqual({ errorId: 77 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'boom', failure: 'threw', destination: 'task-delayed-auto-commit', messageId: 'm1', queueMessage: payload }),
      'error',
      { workflowId: 'w-task' },
    );
  });
});
