import { describe, expect, it, vi } from 'vitest';
import queueFactory, {
  addQueueListener,
  createQueue,
  pendingJobsCount,
  removeQueueListeners
} from 'helpers/queueFactory';

describe('queueFactory', () => {
  it('reuses the same queue instance per id', () => {
    const q1 = queueFactory.get('a');
    const q2 = queueFactory.get('a');
    expect(q1).toBe(q2);
  });

  it('creates a fresh queue after the previous one is killed', () => {
    const q1 = queueFactory.get('b');
    queueFactory.kill('b');
    const q2 = queueFactory.get('b');
    expect(q1).not.toBe(q2);
  });

  it('runs pushed jobs', async () => {
    const q = queueFactory.get('c');
    const result = await new Promise((resolve) => {
      q.push((cb?: (error?: Error) => void) => {
        resolve('done');
        cb?.();
      });
    });
    expect(result).toBe('done');
  });

  it('keeps processing remaining jobs after a job fails', async () => {
    const q = createQueue({ autostart: true, concurrency: 1 });
    const errors: Error[] = [];
    const done = vi.fn();
    addQueueListener(q, 'error', ({ detail }) => errors.push(detail.error));
    const ended = new Promise<void>((resolve) => addQueueListener(q, 'end', () => resolve()));

    q.push(async () => {
      throw new Error('boom');
    });
    q.push(async () => done());
    await ended;

    expect(errors).toHaveLength(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('passes the first resolved value as detail.result[0] on success', async () => {
    const q = createQueue({ autostart: true, concurrency: 1 });
    const results: unknown[] = [];
    const ended = new Promise<void>((resolve) => addQueueListener(q, 'end', () => resolve()));
    addQueueListener(q, 'success', ({ detail }) => results.push(detail.result[0]));

    q.push(async () => 'value');
    await ended;

    expect(results).toEqual(['value']);
  });

  it('removes all registered listeners of an event', async () => {
    const q = createQueue({ autostart: true, concurrency: 1 });
    const listener = vi.fn();
    addQueueListener(q, 'end', listener);
    addQueueListener(q, 'end', listener);
    removeQueueListeners(q, 'end');
    const ended = new Promise<void>((resolve) => addQueueListener(q, 'end', () => resolve()));

    q.push(async () => undefined);
    await ended;

    expect(listener).not.toHaveBeenCalled();
  });

  it('counts jobs waiting to start', () => {
    const q = createQueue({ autostart: false });
    q.push(async () => undefined, async () => undefined);

    expect(pendingJobsCount(q)).toBe(2);
  });
});
