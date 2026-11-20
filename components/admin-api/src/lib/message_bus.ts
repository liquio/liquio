import { createMessageBus, withBpmnLogContext } from '@liquio/back-core';

import { getLog } from './context';

export const DESTINATION_BY_QUEUE_NAME = {
  writingQueueManager: 'manager',
  writingQueueTask: 'task',
  writingQueueEvent: 'event',
  writingQueueGateway: 'gateway',
} as const;

/**
 * Create the message bus used to publish workflow messages.
 * @param {object} config Config object.
 * @returns {object} Message bus.
 */
export function createAdminApiMessageBus(config: any) {
  const mq = config.message_queue;
  return createMessageBus({
    provider: mq.provider,
    providerOptions: mq,
    destinations: withBpmnLogContext({
      manager: { address: mq.writingQueueManager },
      task: { address: mq.writingQueueTask },
      event: { address: mq.writingQueueEvent },
      gateway: { address: mq.writingQueueGateway },
    }),
    getLog,
    reconnectDelayMs: mq.retryConnectionTime,
  } as any);
}
