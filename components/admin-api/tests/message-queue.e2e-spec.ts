import * as amqplib from 'amqplib';

import { TestApp } from './test-app';
import { prepareFixtures, WORKFLOW_FIXTURES } from './fixtures';
import { asAdmin, grantAllAdminUnits } from './fixtures/auth';
import { getLog, getMessageBus } from '../src/lib/context';
import { registerShutdown } from '../src/lib/shutdown';

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

    // Queues declared up front with plain durable settings must stay compatible with the bus declarations.
    connection = await amqplib.connect(TestApp.amqpUrl);
    channel = await connection.createChannel();
    for (const queue of QUEUES) {
      await channel.assertQueue(queue, { durable: true });
    }

    app = await TestApp.setup();
    await prepareFixtures(app);
    await grantAllAdminUnits(app);

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

  it('publishes a message to the configured queue', async () => {
    await expect(getMessageBus()!.publish('task', { type: 'ping', data: { value: 1 } })).resolves.toEqual({ messageId: expect.any(String) });
  });

  it('delivers the published message to the task queue', async () => {
    const message = await nextMessage('test-admin-to-task');
    expect(message).toMatchObject({ type: 'ping', data: { value: 1 } });
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
    const reconnectsBefore = getMessageBus()!.health().reconnects;

    await TestApp.rabbitmqContainer.exec(['rabbitmqctl', 'close_all_connections', 'test']);

    // The raw test connection uses the same broker user and is dropped as well.
    await channel.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
    connection = await amqplib.connect(TestApp.amqpUrl);
    channel = await connection.createChannel();

    await waitFor(async () => getMessageBus()!.health().reconnects > reconnectsBefore);

    await waitFor(async () => {
      try {
        await getMessageBus()!.publish('manager', { type: 'after-reconnect' });
        return true;
      } catch {
        return false;
      }
    });
    const message = await nextMessage('test-admin-to-manager');
    expect(message).toMatchObject({ type: 'after-reconnect' });
  });

  it('does not put message bodies in logs', async () => {
    const workflowId = WORKFLOW_FIXTURES[0].id;
    const logs = getLog().getLogs();
    const before = logs.length;

    await asAdmin(app, 'post', `/workflow-processes/${workflowId}/restart`)
      .send({ message: { workflowId, initData: 'sentinel-init-data', performerUsersIpn: ['sentinel-ipn'] } })
      .expect(202);
    await waitForAny();

    const entries = logs.slice(before);
    expect(JSON.stringify(entries)).not.toContain('sentinel-');
    const published = entries.find((entry) => entry[0] === 'message-bus-published');
    expect(published?.[1]).toMatchObject({ destination: 'manager', messageId: expect.any(String), workflowId });
  });

  it('serves an in-flight request, stops accepting connections and exits once on SIGTERM', async () => {
    const { EventEmitter } = await import('node:events');
    const emitter = new EventEmitter();
    const exit = jest.fn();
    const workflowId = WORKFLOW_FIXTURES[0].id;
    const bus = getMessageBus()!;
    const closeSpy = jest.spyOn(bus, 'close');

    // Delay the publish so that the request is still in flight when the signal arrives.
    const publish = bus.publish.bind(bus);
    const publishSpy = jest.spyOn(bus, 'publish').mockImplementation(async (...args: any[]) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return (publish as any)(...args);
    });

    const inFlight = asAdmin(app, 'post', `/workflow-processes/${workflowId}/restart`).send({ message: { workflowId, stepId: 'start' } });
    const response = inFlight.then((res) => res);
    await waitFor(async () => publishSpy.mock.calls.length > 0);

    const unregister = registerShutdown({ routerService: app.routerService, messageBus: bus }, { processLike: emitter, exit });
    emitter.emit('SIGTERM');

    const { server } = app.routerService as any;
    await waitFor(async () => !server.listening);
    const { port } = server.address() || { port: undefined };
    expect(port).toBeUndefined();

    expect((await response).status).toBe(202);
    await waitFor(async () => exit.mock.calls.length > 0);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalled();

    unregister?.();
    publishSpy.mockRestore();
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
