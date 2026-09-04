import queue from 'queue';

class QueueFactory {
  queues = {};

  get = (queueId, concurrency = 1) => {
    if (!this.queues[queueId]) {
      this.queues[queueId] = queue({ autostart: true, concurrency });
    }

    return this.queues[queueId];
  };

  kill = (queueId) => {
    this.queues[queueId] = null;
  };
}

const queueFactory = new QueueFactory();

export default queueFactory;
