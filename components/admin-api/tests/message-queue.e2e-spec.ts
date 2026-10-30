import * as amqplib from 'amqplib';

import { TestApp } from './test-app';
import { prepareFixtures, WORKFLOW_FIXTURES } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';
import { getLog, getMessageQueue } from '../src/lib/context';

const QUEUES = ['test-admin-to-manager', 'test-admin-to-task', 'test-admin-to-event', 'test-admin-to-gateway'];

const waitFor = async <T>(check: () => Promise<T | undefined | false>, timeoutMs = 20000): Promise<T> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await check();
    if (result) {
      return result as T;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Condition was not met in time.');
};

describe('Message queue', () => {
  let app: TestApp;
  let connection: any;
  let channel: any;

  const nextMessage = async (queue: string) =>
    waitFor(async () => {
      const message = await channel.get(queue, { noAck: true });
      return message ? JSON.parse(message.content.toString()) : undefined;
    });

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);

    connection = await amqplib.connect(TestApp.amqpUrl);
    channel = await connection.createChannel();
    for (const queue of QUEUES) {
      await channel.assertQueue(queue, { durable: true });
      await channel.purgeQueue(queue);
    }
  });

  afterAll(async () => {
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  it('publishes a message to the configured queue', () => {
    expect(getMessageQueue().produce('writingQueueTask', { type: 'ping', data: { value: 1 } })).toBe(true);
  });

  it('delivers the published message to the task queue', async () => {
    const message = await nextMessage('test-admin-to-task');
    expect(message).toEqual({ type: 'ping', data: { value: 1 } });
  });

  it('publishes the restart command of a workflow process through HTTP', async () => {
    const workflowId = WORKFLOW_FIXTURES[0].id;
    await asAdmin(app, 'post', `/workflow-processes/${workflowId}/restart`)
      .send({ message: { workflowId, stepId: 'start', debug: false } })
      .expect(202);

    // The command goes to one of the service queues and carries a fresh message id.
    const delivered = await waitForAny();
    expect(delivered.amqpMessageId).toEqual(expect.any(String));
    expect(JSON.stringify(delivered)).toContain(workflowId);
  });

  it('reconnects after the broker connection is lost', async () => {
    const mq = getMessageQueue();
    mq.config.retryConnectionTime = 100;
    const logs = getLog().getLogs();
    const before = logs.length;

    // Drop the connection from the app side: the close event schedules a reconnect.
    mq.connection.close();

    await waitFor(async () => logs.slice(before).some((entry) => entry[0] === 'amqp-successfully-reconnected'));

    expect(mq.produce('writingQueueManager', { type: 'after-reconnect' })).toBe(true);
    const message = await nextMessage('test-admin-to-manager');
    expect(message).toEqual({ type: 'after-reconnect' });
  });

  async function waitForAny() {
    return waitFor(async () => {
      for (const queue of QUEUES) {
        const message = await channel.get(queue, { noAck: true });
        if (message) {
          return JSON.parse(message.content.toString());
        }
      }
      return undefined;
    });
  }
});
