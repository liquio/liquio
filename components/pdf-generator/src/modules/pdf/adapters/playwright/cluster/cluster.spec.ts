import { log } from '@lib/log';
import { Cluster, QueueFullException } from './cluster';
import { Worker } from './worker';

jest.mock('./worker');
jest.mock('@lib/log', () => ({ log: { save: jest.fn() } }));

function makeCluster(maxQueueSize: number) {
  let release: Array<() => void> = [];
  const handle = jest.fn().mockImplementation(() => new Promise<Buffer>((resolve) => release.push(() => resolve(Buffer.from('pdf')))));
  (Worker as unknown as jest.Mock).mockImplementation(() => ({ launch: jest.fn().mockResolvedValue(undefined), close: jest.fn(), handle }));
  const cluster = new Cluster({ maxWorkers: 1, maxQueueSize });
  const job = () => cluster.execute({ html: '<p>x</p>', options: {} as never });
  const drain = async () => {
    while (release.length) {
      const pending = release;
      release = [];
      pending.forEach((fn) => fn());
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
  return { cluster, job, drain };
}

describe('Cluster queue limit', () => {
  it('rejects with 429 and Retry-After once the queue is full', async () => {
    const { cluster, job, drain } = makeCluster(2);
    await cluster.init();

    const running = job(); // taken by the only worker
    const queued = [job(), job()]; // fill the queue
    const error = await job().catch((e) => e);

    expect(error).toBeInstanceOf(QueueFullException);
    expect(error.getStatus()).toBe(429);
    expect(error.retryAfterSeconds).toBeGreaterThan(0);
    expect((cluster as unknown as { queue: unknown[] }).queue).toHaveLength(2);

    await drain();
    await Promise.all([running, ...queued]);
  });

  it('accepts new jobs again after the queue drains', async () => {
    const { cluster, job, drain } = makeCluster(1);
    await cluster.init();

    const first = job();
    const second = job();
    await expect(job()).rejects.toBeInstanceOf(QueueFullException);

    await drain();
    await Promise.all([first, second]);

    const third = job();
    await drain();
    await expect(third).resolves.toEqual(Buffer.from('pdf'));
  });
});

describe('Cluster noSandbox', () => {
  beforeEach(() => {
    (Worker as unknown as jest.Mock).mockClear();
    (log.save as jest.Mock).mockClear();
  });

  it('does not pass noSandbox or warn by default', async () => {
    const { cluster } = makeCluster(1);
    await cluster.init();

    expect((Worker as unknown as jest.Mock).mock.calls[0][0].noSandbox).toBeUndefined();
    expect(log.save).not.toHaveBeenCalledWith('pdf-generator|chromium-sandbox-disabled', expect.anything());
  });

  it('passes noSandbox to workers and logs a startup warning', async () => {
    makeCluster(1);
    const cluster = new Cluster({ maxWorkers: 1, noSandbox: true });
    await cluster.init();

    expect((Worker as unknown as jest.Mock).mock.calls[0][0].noSandbox).toBe(true);
    expect(log.save).toHaveBeenCalledWith('pdf-generator|chromium-sandbox-disabled', expect.anything());
  });
});
