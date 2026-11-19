import { createMessageBus, bpmnMessageLogContext, withBpmnLogContext, errorRef, MESSAGE_BUS_RETRY_DELAYS, MessageBus } from '@liquio/back-core';
import type { FailureHook, HandlerFailure } from '@liquio/back-core';

import { getConfig, getLog, getMessageBus, getModels, getRedisClientCommonBpmn } from './context';

export const DESTINATION_TASK = 'task';
export const DESTINATION_MANAGER = 'manager';
export const DESTINATION_TASK_PDF = 'task-pdf';
export const DESTINATION_TASK_DELAYED_AUTO_COMMIT = 'task-delayed-auto-commit';

export const GENERATING_PDF_QUEUE_NAME = 'bpmn-task-incoming-generating-pdf';

export const taskMessageLogContext = bpmnMessageLogContext(DESTINATION_TASK);

/**
 * Auto-commit delay tiers in milliseconds by queue suffix.
 * @param {object} mq Message queue config.
 * @returns {object} Tiers.
 */
export function delayedAutoCommitTiers(mq: any): { [suffix: string]: number } {
  const tiers: { [suffix: string]: number } = {};
  for (const [suffix, seconds] of Object.entries(mq?.delayedAutoCommitQueues || {})) {
    tiers[suffix] = Number(seconds) * 1000;
  }
  return tiers;
}

/**
 * Check if reading of PDF generating messages is enabled.
 * @param {object} mq Message queue config.
 * @returns {boolean} Is enabled.
 */
export function isPdfReadingEnabled(mq: any): boolean {
  return typeof mq.enabledReadingGeneratingPdfMessages === 'undefined' || mq.enabledReadingGeneratingPdfMessages === true;
}

/**
 * Map the legacy Redis dedup config onto the provider dedup section.
 * @param {object} config Config object.
 * @returns {object} Dedup options.
 */
export function legacyDedupOptions(config: any) {
  const cache = config.redis?.redisCommonBpmn?.amqpMessageCache;
  return {
    isEnabled: true,
    // Read per message, as before: the legacy flag can be toggled in config at runtime.
    getStore: () => (getConfig()?.redis?.redisCommonBpmn?.amqpMessageCache?.isEnabled ? getRedisClientCommonBpmn() : null),
    ttl: cache?.ttl,
  };
}

/**
 * Resolve the workflow ID from a trusted entity, never from the message's own workflowId.
 * @param {string} destination Destination name.
 * @param {object} payload Message payload.
 * @returns {Promise<string|null>} Workflow ID.
 */
export async function resolveTrustedWorkflowId(destination: string, payload: any): Promise<string | null> {
  try {
    if (destination === DESTINATION_TASK_DELAYED_AUTO_COMMIT) {
      const task: any = await getModels().task.findById(payload?.taskId);
      return task?.workflowId ?? null;
    }
    if (destination === DESTINATION_TASK_PDF) {
      const task: any = await getModels().task.findByDocumentId(payload?.documentId);
      return task?.workflowId ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Record a handler failure in workflow errors.
 * @param {object} failure Handler failure.
 * @returns {Promise<{errorId: number|undefined}>} Failure record reference.
 */
export const recordHandlerFailure: FailureHook = async ({ destination, messageId, payload, failure, error }: HandlerFailure) => {
  const err: any = error;
  const workflowId = await resolveTrustedWorkflowId(destination, payload);
  const errorId = await getModels().workflowError.create(
    { error: err?.message ?? String(err), details: err?.details, cause: err?.cause, failure, destination, messageId, queueMessage: payload },
    'error',
    { workflowId },
  );
  return { errorId };
};

/**
 * Create task message bus.
 * @param {object} config Config object.
 * @returns {MessageBus} Message bus.
 */
export function createTaskMessageBus(config: any): MessageBus {
  const mq = config.message_queue || {};
  const autoCommitTiers = delayedAutoCommitTiers(mq);
  return createMessageBus({
    provider: mq.provider,
    providerOptions: { ...mq, dedup: mq.dedup ?? legacyDedupOptions(config) },
    destinations: withBpmnLogContext({
      [DESTINATION_TASK]: { address: mq.readingQueueName, delays: { ...MESSAGE_BUS_RETRY_DELAYS } },
      [DESTINATION_MANAGER]: { address: mq.writingQueueName },
      [DESTINATION_TASK_PDF]: { address: GENERATING_PDF_QUEUE_NAME },
      ...(Object.keys(autoCommitTiers).length
        ? { [DESTINATION_TASK_DELAYED_AUTO_COMMIT]: { address: `${mq.readingQueueName}-delayed-auto-commit`, delays: autoCommitTiers } }
        : {}),
    }),
    getLog,
    reconnectDelayMs: mq.retryConnectionTime,
    connectInBackground: true,
    publishRetry: { attempts: 1, delayMs: 60 * 1000 },
  });
}

/**
 * Publish a message without ever rejecting.
 * @param {string} destination Destination name.
 * @param {object} payload Message payload.
 * @param {object} [options] Publish options.
 * @returns {Promise<boolean>} Is published.
 */
export async function publishOrLog(destination: string, payload: any, options?: { delayMs?: number; messageId?: string }): Promise<boolean> {
  try {
    const bus = getMessageBus() as MessageBus;
    await (options ? bus.publish(destination, payload, options) : bus.publish(destination, payload));
    return true;
  } catch (error) {
    getLog()?.save('message-bus-publish-failed', { destination, ...bpmnMessageLogContext(destination)(payload), error: errorRef(error) }, 'error');
    return false;
  }
}
