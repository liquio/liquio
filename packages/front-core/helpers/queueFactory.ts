import Queue, { type Options, type QueueWorker } from 'queue';

export type { Queue };

interface QueueEventDetails {
  end: { error?: Error };
  error: { error: Error; job: QueueWorker };
  success: { result: unknown[] };
  start: { job?: QueueWorker };
}

export type QueueEventName = keyof QueueEventDetails;
export type QueueListener<N extends QueueEventName> = (event: { detail: QueueEventDetails[N] }) => void;

type AnyListener = (event: never) => void;

const registry = new WeakMap<Queue, Map<QueueEventName, Set<AnyListener>>>();

/**
 * Creates a queue that, like queue@6, keeps processing remaining jobs when a job fails:
 * queue@7 registers a default 'error' listener that ends the queue and drops pending jobs.
 */
export const createQueue = (options?: Options): Queue => {
  const instance = new Queue(options);
  instance.removeEventListener('error', (instance as unknown as { _errorHandler: () => void })._errorHandler);

  return instance;
};

export const addQueueListener = <N extends QueueEventName>(queue: Queue, name: N, listener: QueueListener<N>): void => {
  const listeners = registry.get(queue) ?? new Map<QueueEventName, Set<AnyListener>>();
  const set = listeners.get(name) ?? new Set<AnyListener>();
  const anyListener: AnyListener = listener;
  set.add(anyListener);
  listeners.set(name, set);
  registry.set(queue, listeners);
  queue.addEventListener(name, anyListener as Parameters<Queue['addEventListener']>[1]);
};

export const removeQueueListeners = (queue: Queue, name: QueueEventName): void => {
  const set = registry.get(queue)?.get(name);
  set?.forEach((listener) => queue.removeEventListener(name, listener as Parameters<Queue['removeEventListener']>[1]));
  set?.clear();
};

/** Number of jobs waiting to start (excludes running ones); `.jobs` is missing from the package typings. */
export const pendingJobsCount = (queue: Queue): number => (queue as unknown as { jobs: unknown[] }).jobs.length;

/** Whether the queue has been started and is still draining; `.running` is missing from the package typings. */
export const isQueueRunning = (queue: Queue): boolean => Boolean((queue as unknown as { running: boolean }).running);

class QueueFactory {
  private queues: Record<string, Queue | null> = {};

  get = (queueId: string, concurrency = 1): Queue => {
    if (!this.queues[queueId]) {
      this.queues[queueId] = createQueue({ autostart: true, concurrency });
    }

    return this.queues[queueId] as Queue;
  };

  kill = (queueId: string): void => {
    this.queues[queueId] = null;
  };
}

const queueFactory = new QueueFactory();

export default queueFactory;
