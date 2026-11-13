import { createMessageBus, bpmnMessageLogContext, withBpmnLogContext, FailureHook, HandlerFailure, MessageBus } from '@liquio/back-core';

import { getConfig, getLog, getRedisClient } from './context';
import { WorkflowErrorModel } from '../models/workflow_error';
import { TaskModel } from '../models/task';
import { GatewayModel } from '../models/gateway';
import { EventModel } from '../models/event';

export const DESTINATION_MANAGER = 'manager';
export const DESTINATION_TASK = 'task';
export const DESTINATION_EVENT = 'event';
export const DESTINATION_GATEWAY = 'gateway';

export const managerMessageLogContext = bpmnMessageLogContext(DESTINATION_MANAGER);

/**
 * Build bus destinations from the message queue config.
 * @param {object} mq Message queue config.
 * @returns {object} Destinations.
 */
export function buildDestinations(mq: any): Record<string, { address: string }> {
  const destinations: Record<string, { address: string }> = {
    [DESTINATION_MANAGER]: { address: mq.readingQueueName },
    [DESTINATION_TASK]: { address: mq.writingQueueTask },
    [DESTINATION_EVENT]: { address: mq.writingQueueEvent },
    [DESTINATION_GATEWAY]: { address: mq.writingQueueGateway },
  };
  for (const key of Object.keys(mq.specificWritingQueuesEvent || {})) {
    destinations[`${DESTINATION_EVENT}.${key}`] = { address: `${mq.writingQueueEvent}-${key}` };
  }
  return destinations;
}

/**
 * Resolve the event destination for a message. The last matching specific queue wins.
 * @param {object} mq Message queue config.
 * @param {object} message Message object.
 * @returns {string} Destination name.
 */
export function resolveEventDestination(mq: any, message: any): string {
  const workflowTemplateId = message?.workflowTemplateId;
  if (!workflowTemplateId) {
    return DESTINATION_EVENT;
  }
  const key = Object.entries(mq?.specificWritingQueuesEvent || {}).reduce((acc: string | null, [name, value]: [string, any]) => {
    return value.includes(workflowTemplateId) ? name : acc;
  }, null);
  return key ? `${DESTINATION_EVENT}.${key}` : DESTINATION_EVENT;
}

/**
 * Map the legacy Redis dedup config onto the provider dedup section.
 * @param {object} config Config object.
 * @returns {object} Dedup options.
 */
export function legacyDedupOptions(config: any) {
  return {
    isEnabled: true,
    // Read per message, as before: the legacy flag can be toggled in config at runtime.
    getStore: () => (getConfig()?.redis?.amqpMessageCache?.isEnabled ? getRedisClient() : null),
    ttl: config.redis?.amqpMessageCache?.ttl,
  };
}

/**
 * Resolve the workflow id from the entity named by the message. The message's own workflowId is never used.
 * @param {object} payload Message payload.
 * @returns {Promise<string|null>} Workflow id.
 */
export async function resolveTrustedWorkflowId(payload: any): Promise<string | null> {
  try {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    let entity: any;
    if (Object.prototype.hasOwnProperty.call(payload, 'taskId')) {
      entity = await new TaskModel().findById(payload.taskId);
    } else if (Object.prototype.hasOwnProperty.call(payload, 'gatewayId')) {
      entity = await new GatewayModel().findById(payload.gatewayId);
    } else if (Object.prototype.hasOwnProperty.call(payload, 'eventId')) {
      entity = await new EventModel().findById(payload.eventId);
    }
    return entity?.workflowId ?? null;
  } catch {
    return null;
  }
}

/**
 * Record a handler failure in workflow errors.
 * @param {object} failure Handler failure.
 * @returns {Promise<{errorId: number|undefined}>} Failure record reference.
 */
export const recordHandlerFailure: FailureHook = async ({ destination, messageId, payload, failure, error }: HandlerFailure) => {
  const err: any = error;
  const workflowId = await resolveTrustedWorkflowId(payload);
  const errorId = await new WorkflowErrorModel().create({
    error: err?.message ?? String(err),
    details: err?.details,
    cause: err?.cause,
    failure,
    destination,
    messageId,
    queueMessage: payload,
    workflowId,
  });
  return { errorId };
};

/**
 * Create manager message bus.
 * @param {object} config Config object.
 * @returns {MessageBus} Message bus.
 */
export function createManagerMessageBus(config: any): MessageBus {
  const mq = config.message_queue || {};
  return createMessageBus({
    provider: mq.provider,
    providerOptions: { ...mq, dedup: mq.dedup ?? legacyDedupOptions(config) },
    destinations: withBpmnLogContext(buildDestinations(mq)),
    getLog,
    reconnectDelayMs: mq.retryConnectionTime,
  });
}
