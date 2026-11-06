import queue from 'queue';

type Queue = ReturnType<typeof queue>;

class QueueFactory {
  private queues: Record<string, Queue | null> = {};

  get = (queueId: string, concurrency = 1): Queue => {
    if (!this.queues[queueId]) {
      this.queues[queueId] = queue({ autostart: true, concurrency });
    }

    return this.queues[queueId] as Queue;
  };

  kill = (queueId: string): void => {
    this.queues[queueId] = null;
  };
}

const queueFactory = new QueueFactory();

export default queueFactory;
