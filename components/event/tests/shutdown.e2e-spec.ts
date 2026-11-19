import { EventEmitter } from 'events';

import amqp from 'amqplib/callback_api';

import { TestApp } from './test-app';
import { getConfig } from '../src/lib/context';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(url: string): Promise<{ connection: any; channel: any }> {
  return new Promise((resolve, reject) => {
    amqp.connect(url, (error: any, connection: any) => {
      if (error) return reject(error);
      connection.createChannel((err: any, channel: any) => (err ? reject(err) : resolve({ connection, channel })));
    });
  });
}

const readyCount = (channel: any, queue: string): Promise<number> =>
  new Promise((resolve, reject) => channel.checkQueue(queue, (e: any, ok: any) => (e ? reject(e) : resolve(ok.messageCount))));

describe('Event shutdown', () => {
  let app: TestApp;
  let raw: { connection: any; channel: any };

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    raw = await connect(getConfig().message_queue.amqpConnection);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => raw?.connection.close(() => resolve()));
    await TestApp.afterAll(app);
  });

  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  afterEach(async () => {
    await TestApp.afterEach(app);
  });

  it('drains the in-flight message on SIGTERM, leaves the queue empty and exits once', async () => {
    const readingQueue = getConfig().message_queue.readingQueueName;
    let finished = false;
    let started: () => void;
    const startedPromise = new Promise<void>((resolve) => (started = resolve));
    jest.spyOn(app.eventBusiness, 'createFromMessage').mockImplementation((async () => {
      started();
      await sleep(1000);
      finished = true;
    }) as any);

    (app as any).routerService = { stop: async () => undefined };
    const emitter = new EventEmitter();
    const exit = jest.fn();
    app.useGracefulShutdown({ processLike: emitter, exit });

    raw.channel.sendToQueue(readingQueue, Buffer.from(JSON.stringify({ workflowId: 'w1' })), { persistent: true });
    await startedPromise;
    emitter.emit('SIGTERM');
    expect(exit).not.toHaveBeenCalled();

    const start = Date.now();
    while (!exit.mock.calls.length && Date.now() - start < 10000) {
      await sleep(50);
    }
    expect(exit).toHaveBeenCalledTimes(1);
    expect(finished).toBe(true);
    // The consumer connection is closed, so an unacked message would have returned to the queue as ready.
    expect(await readyCount(raw.channel, readingQueue)).toBe(0);
    expect((app as any).log.logs.some((entry: any) => entry.type === 'message-bus-settle-error')).toBe(false);
  });
});
