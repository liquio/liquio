import { getRetryDelayMs } from '@liquio/back-core';

import { TestApp } from './test-app';
import { prepareFixtures, TASK_FIXTURES, DOCUMENT_FIXTURES } from './fixtures';
import { getConfig, getLog, getMessageBus } from '../src/lib/context';
import { TaskBusiness } from '../src/businesses/task';
import { DocumentFileBusiness } from '../src/businesses/document/files';
import { createTaskMessageBus } from '../src/lib/message_bus';

const READING_QUEUE = 'bpmn-task-incoming';
const PDF_QUEUE = 'bpmn-task-incoming-generating-pdf';
const DELAYED_QUEUE = `${READING_QUEUE}-delayed-auto-commit`;

const WORKFLOW_FIXTURE_ID = TASK_FIXTURES[0].workflow_id;
const USER_ID = '61efddaa351d6219eee09043';
const UNKNOWN_ID = 'f0000000-0000-4000-8000-000000000000';

// The consumers are bound at startup, so the handlers are spied on the prototypes (calling through) before the app boots.
const createFromMessageSpy = jest.spyOn(TaskBusiness.prototype, 'createFromMessage');
const delayedAutoCommitSpy = jest.spyOn(TaskBusiness.prototype, 'delayedAutoCommitFromMessage');
const createPdfFromMessageSpy = jest.spyOn(DocumentFileBusiness.prototype, 'createPdfFromMessage');

describe('Task message bus consumers', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  const allLogs = (): any[][] => (getLog() as any).getLogs();
  const logged =
    (name: string, from = 0) =>
    () =>
      allLogs()
        .slice(from)
        .some((args) => args[0] === name);
  const logsOf = (name: string, from = 0) =>
    allLogs()
      .slice(from)
      .filter((args) => args[0] === name)
      .map((args) => args[1]);
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const readyCount = async (queue: string) => (await (await app.getTestAmqpChannel()).checkQueue(queue)).messageCount;

  it('asserts the delayed auto commit queues and the consumers are subscribed', async () => {
    const channel = await app.getTestAmqpChannel();
    for (const queue of [READING_QUEUE, PDF_QUEUE, DELAYED_QUEUE, `${DELAYED_QUEUE}-1s`]) {
      await expect(channel.checkQueue(queue)).resolves.toBeDefined();
    }
  });

  it('createFromMessage creates a task from a queue message and acks it', async () => {
    const before = await app.model('task').count({ where: { task_template_id: 988191001 } });

    app.nockId.post('/user/info/id').reply(200, [{ userId: '61efddaa351d6219eee09043', role: 'individual', services: {} }]);

    await app.publishMessage(READING_QUEUE, {
      workflowTemplateId: 988191,
      taskTemplateId: 988191001,
      userId: '61efddaa351d6219eee09043',
      initData: {},
    });

    await app.waitFor(async () => (await app.model('task').count({ where: { task_template_id: 988191001 } })) > before);
    await app.waitFor(logged('message-bus-handled'));
  });

  it('createPdfFromMessage resets the file fields of the document when the pdf cannot be created', async () => {
    const documentId = DOCUMENT_FIXTURES[0].id;
    await app.model('document').update({ file_id: 'e2e-file-id', file_name: 'e2e.pdf', file_type: 'application/pdf' }, { where: { id: documentId } });

    await app.publishMessage(PDF_QUEUE, { documentId, userId: '61efddaa351d6219eee09043' });

    await app.waitFor(async () => {
      const document = await app.model('document').findByPk(documentId);
      return document.file_id === null;
    });
  });

  it('delayedAutoCommitFromMessage finishes the task', async () => {
    const taskId = TASK_FIXTURES[0].id;
    expect((await app.model('task').findByPk(taskId)).finished).toBe(false);
    const publish = jest.spyOn(getMessageBus() as any, 'publish').mockResolvedValue({ messageId: 'x' });

    await app.publishMessage(DELAYED_QUEUE, { taskId });

    await app.waitFor(async () => (await app.model('task').findByPk(taskId)).finished === true);
    // The handler keeps querying the DB after it finishes the task; wait for its last step so teardown
    // does not close the DB under it.
    await app.waitFor(() => publish.mock.calls.some(([destination, message]: any[]) => destination === 'manager' && message?.taskId === taskId));
    publish.mockRestore();
  });

  it('reads a raw message from the PDF queue into createPdfFromMessage and acks it', async () => {
    const from = allLogs().length;
    createPdfFromMessageSpy.mockResolvedValueOnce(true);
    await app.publishMessage(PDF_QUEUE, { documentId: DOCUMENT_FIXTURES[0].id, userId: USER_ID });

    await app.waitFor(() => logsOf('message-bus-handled', from).some((entry) => entry.destination === 'task-pdf'));
    expect(createPdfFromMessageSpy).toHaveBeenCalledTimes(1);
    expect(await readyCount(PDF_QUEUE)).toBe(0);
  });

  describe('handler failures', () => {
    const handlerErrors = (from: number) => logsOf('message-bus-handler-error', from);

    it('discards a message once when the main handler rejects and records an unlinked row', async () => {
      const from = allLogs().length;
      const before = getMessageBus()!.health().counters.handlerErrors;
      createFromMessageSpy.mockRejectedValueOnce(new Error('SENTINEL-MSG'));
      const calls = createFromMessageSpy.mock.calls.length;

      await app.publishMessage(READING_QUEUE, { workflowId: WORKFLOW_FIXTURE_ID, taskTemplateId: 31689003, extra: { value: 'SENTINEL-X' } });
      await app.waitFor(() => handlerErrors(from).length > 0, 5000);
      await sleep(1000);

      expect(createFromMessageSpy.mock.calls.length).toBe(calls + 1);
      expect(await readyCount(READING_QUEUE)).toBe(0);
      expect(getMessageBus()!.health().counters.handlerErrors).toBe(before + 1);
      expect(handlerErrors(from)).toHaveLength(1);
      const entry = handlerErrors(from)[0];
      expect(entry).toMatchObject({ failure: 'threw', workflowId: WORKFLOW_FIXTURE_ID, taskTemplateId: 31689003, error: { name: 'Error' } });
      expect(entry.errorId).toEqual(expect.any(Number));
      expect(JSON.stringify(allLogs().slice(from))).not.toContain('SENTINEL');

      const row = await app.model('workflowError').findByPk(entry.errorId);
      expect(row.workflow_id).toBeNull();
      expect(row.data).toMatchObject({ failure: 'threw', queueMessage: { workflowId: WORKFLOW_FIXTURE_ID } });
      expect((await app.model('workflow').findByPk(WORKFLOW_FIXTURE_ID)).has_unresolved_errors).toBe(false);
    });

    it('discards a message once when the PDF handler resolves a non-boolean', async () => {
      const from = allLogs().length;
      createPdfFromMessageSpy.mockResolvedValueOnce(undefined as any);
      const calls = createPdfFromMessageSpy.mock.calls.length;

      await app.publishMessage(PDF_QUEUE, { documentId: DOCUMENT_FIXTURES[0].id, userId: USER_ID, extra: 'SENTINEL-X' });
      await app.waitFor(() => handlerErrors(from).length > 0, 5000);
      await sleep(1000);

      expect(createPdfFromMessageSpy.mock.calls.length).toBe(calls + 1);
      expect(await readyCount(PDF_QUEUE)).toBe(0);
      const entry = handlerErrors(from)[0];
      expect(entry).toMatchObject({ failure: 'invalid-result', documentId: DOCUMENT_FIXTURES[0].id });
      expect(JSON.stringify(allLogs().slice(from))).not.toContain('SENTINEL');
      const row = await app.model('workflowError').findByPk(entry.errorId);
      expect(row.workflow_id).toBe(TASK_FIXTURES[0].workflow_id);
    });

    it('links a delayed auto commit failure through the task entity, not through the message', async () => {
      const from = allLogs().length;
      delayedAutoCommitSpy.mockRejectedValueOnce(new Error('SENTINEL-MSG'));
      await app.publishMessage(DELAYED_QUEUE, { taskId: TASK_FIXTURES[1].id, workflowId: TASK_FIXTURES[0].workflow_id });
      await app.waitFor(() => handlerErrors(from).length > 0, 5000);
      const row = await app.model('workflowError').findByPk(handlerErrors(from)[0].errorId);
      expect(row.workflow_id).toBe(TASK_FIXTURES[1].workflow_id);
    });

    it('gives NULL for an unknown task even with a planted workflow id', async () => {
      const from = allLogs().length;
      await app.publishMessage(DELAYED_QUEUE, { taskId: UNKNOWN_ID, workflowId: TASK_FIXTURES[0].workflow_id });
      await app.waitFor(() => handlerErrors(from).length > 0, 5000);
      const row = await app.model('workflowError').findByPk(handlerErrors(from)[0].errorId);
      expect(row.workflow_id).toBeNull();
    });
  });

  describe('logs without message bodies', () => {
    it('keeps payload values of a failing main message out of the logs', async () => {
      const from = allLogs().length;
      await app.publishMessage(READING_QUEUE, {
        workflowTemplateId: 988191,
        taskTemplateId: 999999999,
        userId: USER_ID,
        initData: { value: 'SENTINEL-INIT' },
        performerUsersIpn: ['SENTINEL-IPN'],
        performerUsersEmail: ['SENTINEL-EMAIL'],
      });
      await app.waitFor(
        () => logsOf('message-bus-handler-error', from).length > 0 || logsOf('document-creating-by-message-from-queue-error', from).length > 0,
      );
      await sleep(500);
      expect(JSON.stringify(allLogs().slice(from))).not.toContain('SENTINEL');
    });

    it('keeps free-form values of a failing PDF message out of the logs and links nothing for an unknown document', async () => {
      const from = allLogs().length;
      await app.publishMessage(PDF_QUEUE, { documentId: UNKNOWN_ID, userId: USER_ID, extra: 'SENTINEL-X' });
      await app.waitFor(logged('pdf-creating-by-message-from-queue-error', from));
      const entry = logsOf('pdf-creating-by-message-from-queue-error', from)[0];
      expect(entry).toMatchObject({ documentId: UNKNOWN_ID, error: { name: 'NotFoundError' } });
      const row = await app.model('workflowError').findByPk(entry.errorId);
      expect(row.workflow_id).toBeNull();
      expect(row.data.queueMessage.documentId).toBe(UNKNOWN_ID);
      expect(JSON.stringify(allLogs().slice(from))).not.toContain('SENTINEL');
    });
  });

  it('accepts retry and auto commit queues declared with the legacy arguments and publishes a postponed retry', async () => {
    const channel = await app.getTestAmqpChannel();
    const mq = getConfig().message_queue;
    const retryQueue = `${READING_QUEUE}-errors-10m`;
    const timerQueue = `${DELAYED_QUEUE}-1m`;
    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': '', 'x-message-ttl': 10 * 60 * 1000, 'x-dead-letter-routing-key': READING_QUEUE },
    });
    await channel.assertQueue(timerQueue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': '', 'x-message-ttl': 60 * 1000, 'x-dead-letter-routing-key': DELAYED_QUEUE },
    });

    const bus = createTaskMessageBus({ ...getConfig(), message_queue: { ...mq, delayedAutoCommitQueues: { '1m': 60 } } });
    try {
      await bus.init();
      await app.waitFor(() => bus.health().status === 'connected', 10000, 100);
      await bus.publish('task', { taskTemplateId: 1, retryIterator: 1 }, { delayMs: getRetryDelayMs('10m') });
      const message = await app.waitFor(async () => channel.get(retryQueue, { noAck: true }) || undefined, 10000, 100);
      expect(JSON.parse(message.content.toString())).toMatchObject({ taskTemplateId: 1, retryIterator: 1, amqpMessageId: expect.any(String) });
    } finally {
      await bus.close();
    }
  });

  it('closes a bus that is still connecting without an unhandled rejection', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    const bus = createTaskMessageBus(getConfig());
    try {
      await bus.init();
      await expect(bus.close()).resolves.toBeUndefined();
      await sleep(200);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('finishes the message in flight and acks it when the app stops', async () => {
    const from = allLogs().length;
    let finished = false;
    createFromMessageSpy.mockImplementationOnce((async () => {
      await sleep(1500);
      finished = true;
      return true;
    }) as any);

    await app.publishMessage(READING_QUEUE, { taskTemplateId: 1 });
    await app.waitFor(() => getMessageBus()!.health().inFlight === 1, 5000, 50);
    // Stop the way a pod stop does; the DB must still be open while the handler finishes.
    await app.stop();

    expect(finished).toBe(true);
    expect(logsOf('message-bus-handled', from).some((entry) => entry.destination === 'task')).toBe(true);
    expect(logsOf('message-bus-settle-error', from)).toHaveLength(0);
    expect(await readyCount(READING_QUEUE)).toBe(0);
    await app.testAmqpChannel?.close().catch(() => undefined);
    await app.testAmqpConnection?.close().catch(() => undefined);
    (app as any).sandbox?.isolatedEngine?.isolate?.dispose();
    app = undefined as any;
  });
});
