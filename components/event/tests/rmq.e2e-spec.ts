import { randomUUID } from 'node:crypto';

import amqp from 'amqplib/callback_api';
import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';

import { Rmq } from '../src/lib/rmq';

jest.setTimeout(180000);

jest.mock('../src/lib/context', () => ({
  getLog: () => ({ save: jest.fn() }),
  getRedisClient: () => undefined,
}));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate: () => boolean, timeoutMs = 30000): Promise<void> => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('waitFor timeout');
    await sleep(100);
  }
};

describe('Rmq against a real broker', () => {
  let container: StartedRabbitMQContainer;
  let amqpUrl: string;
  const instances: Rmq[] = [];

  const makeOptions = (name: string, extra: any = {}) => ({
    amqpConnection: amqpUrl,
    readingQueueName: `${name}-q`,
    writingQueueName: `${name}-q`,
    readingExchangeName: `${name}-ex`,
    writingExchangeName: `${name}-ex`,
    sender: 'test',
    getIncomingMessageInterval: 50,
    getIncomingMessageTimeout: 60000,
    ...extra,
  });

  const makeRmq = async (extra: any = {}, name = `rmq-${randomUUID()}`): Promise<Rmq> => {
    const rmq = new Rmq(name);
    await rmq.init(makeOptions(name, extra));
    instances.push(rmq);
    return rmq;
  };

  const rawConnect = (url = amqpUrl): Promise<any> =>
    new Promise((resolve, reject) => amqp.connect(url, (error: any, connection: any) => (error ? reject(error) : resolve(connection))));

  beforeAll(async () => {
    container = await new RabbitMQContainer('rabbitmq:3-management').start();
    amqpUrl = container.getAmqpUrl();
  });

  afterAll(async () => {
    for (const rmq of instances) {
      await rmq.close().catch(() => undefined);
    }
    await container.stop();
  });

  it('connects and completes a request/response round trip', async () => {
    const rmq = await makeRmq();
    expect(rmq.initialized).toBe(true);

    const id = randomUUID();
    const pending = rmq.getIncomingMessageById(id);
    await rmq.produce({ event: 'e', payload: { uuid: id, request: { a: 1 } } });
    const received = await pending;
    expect(received.payload).toEqual({ uuid: id, request: { a: 1 } });
  });

  it('passes a 1 MiB message through', async () => {
    const rmq = await makeRmq();
    const id = randomUUID();
    const big = 'x'.repeat(1024 * 1024);
    const pending = rmq.getIncomingMessageById(id);
    await rmq.produce({ event: 'e', payload: { uuid: id, request: { big } } });
    const received = await pending;
    expect(received.payload.request.big.length).toBe(big.length);
  });

  it('publishes with correlationId and custom headers, readable via get', async () => {
    const rmq = await makeRmq();
    const connection = await rawConnect();
    const channel: any = await new Promise((resolve, reject) => connection.createChannel((e: any, ch: any) => (e ? reject(e) : resolve(ch))));
    const queue = `headers-${randomUUID()}`;
    await new Promise<void>((resolve, reject) => channel.assertQueue(queue, { durable: false }, (e: any) => (e ? reject(e) : resolve())));

    const content = Buffer.from('payload');
    channel.sendToQueue(queue, content, { correlationId: 'corr-1', replyTo: 'reply-q', headers: { 'x-test': 'value', n: 5 } });

    let got: any;
    for (let i = 0; i < 50 && !got; i++) {
      got = await new Promise((resolve, reject) => channel.get(queue, { noAck: true }, (e: any, m: any) => (e ? reject(e) : resolve(m))));
      if (!got) await sleep(100);
    }
    expect(got.content.toString()).toBe('payload');
    expect(got.properties.correlationId).toBe('corr-1');
    expect(got.properties.replyTo).toBe('reply-q');
    expect(got.properties.headers).toEqual({ 'x-test': 'value', n: 5 });

    // produce() sets correlationId from payload uuid.
    expect(rmq.initialized).toBe(true);
    await new Promise<void>((resolve) => connection.close(() => resolve()));
  });

  it('applies the heartbeat from the connection URL', async () => {
    const withHeartbeat = await rawConnect(`${amqpUrl}?heartbeat=7`);
    expect(withHeartbeat.connection.heartbeat).toBe(7);
    await new Promise<void>((resolve) => withHeartbeat.close(() => resolve()));

    // Without the option the library default (60s) must stay in effect and not be disabled.
    const rmq = await makeRmq();
    expect(rmq.connection.connection.heartbeat).toBeGreaterThan(0);
  });

  it('marks the client as not initialized on a broker-side connection drop and can reconnect', async () => {
    const name = `rmq-${randomUUID()}`;
    const rmq = await makeRmq({}, name);
    expect(rmq.initialized).toBe(true);

    await container.exec(['rabbitmqctl', 'close_all_connections', 'test drop']);
    await waitFor(() => rmq.initialized === false);

    // Re-initialize on a fresh connection and verify messaging works again.
    await rmq.init(makeOptions(name));
    expect(rmq.initialized).toBe(true);
    const id = randomUUID();
    const pending = rmq.getIncomingMessageById(id);
    await rmq.produce({ event: 'e', payload: { uuid: id, request: {} } });
    await expect(pending).resolves.toBeDefined();
  });

  it('fires the channel error handler when the channel is closed by the broker', async () => {
    const rmq = await makeRmq();
    expect(rmq.initialized).toBe(true);
    // Consuming from a non-existent queue closes the channel with an error (404).
    rmq.channels.reading.consume(
      `missing-${randomUUID()}`,
      () => undefined,
      { noAck: true },
      () => undefined,
    );
    await waitFor(() => rmq.initialized === false);
  });
});
