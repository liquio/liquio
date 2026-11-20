import { createMessageBus, bpmnMessageLogContext, withBpmnLogContext, FailureHook, HandlerFailure, MessageBus } from '@liquio/back-core';

import { getConfig, getLog, getRedisClient } from './context';
import { runInAsyncLocalStorage } from './async_local_storage';
import { WorkflowErrorModel } from '../models/workflow_error';

export const DESTINATION_GATEWAY = 'gateway';
export const DESTINATION_MANAGER = 'manager';

export const gatewayMessageLogContext = bpmnMessageLogContext(DESTINATION_GATEWAY);

/**
 * Map the legacy Redis dedup config onto the provider dedup section.
 * @param {object} config Config object.
 * @returns {object} Dedup options.
 */
export function legacyDedupOptions(config: any) {
  const cache = config.redis?.amqpMessageCache;
  return {
    isEnabled: true,
    // Read per message, as before: the legacy flag can be toggled in config at runtime.
    getStore: () => (getConfig()?.redis?.amqpMessageCache?.isEnabled ? getRedisClient() : null),
    ttl: cache?.ttl,
  };
}

/**
 * Record a handler failure in workflow errors.
 * @param {object} failure Handler failure.
 * @returns {Promise<{errorId: number|undefined}>} Failure record reference.
 */
export const recordHandlerFailure: FailureHook = async ({ destination, messageId, payload, failure, error }: HandlerFailure) => {
  const err: any = error;
  const errorId = await new WorkflowErrorModel().create(
    { error: err?.message ?? String(err), details: err?.details, cause: err?.cause, failure, destination, messageId, queueMessage: payload },
    { workflowId: null }, // Never link by the message's own workflowId.
  );
  return { errorId };
};

/**
 * Create gateway message bus.
 * @param {object} config Config object.
 * @returns {MessageBus} Message bus.
 */
export function createGatewayMessageBus(config: any): MessageBus {
  const mq = config.message_queue || {};
  return createMessageBus({
    provider: mq.provider,
    providerOptions: { ...mq, dedup: mq.dedup ?? legacyDedupOptions(config) },
    destinations: withBpmnLogContext({
      [DESTINATION_GATEWAY]: { address: mq.readingQueueName },
      [DESTINATION_MANAGER]: { address: mq.writingQueueName },
    }),
    getLog,
    reconnectDelayMs: mq.retryConnectionTime,
    runInContext: runInAsyncLocalStorage,
  });
}
