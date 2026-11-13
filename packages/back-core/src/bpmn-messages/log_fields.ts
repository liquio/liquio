import { DestinationConfig, LogContext, LogContextExtractor, pickLogFields } from '../message-bus';

/**
 * Identifier fields that are safe to log, per BPMN message destination.
 * Everything else (initData, unitIds, performer fields, files, sequenceIds, type, data) is never logged.
 */
export const BPMN_MESSAGE_LOG_FIELDS: Readonly<Record<string, readonly string[]>> = {
  manager: [
    'workflowId',
    'taskId',
    'gatewayId',
    'eventId',
    'forwardToTask',
    'workflowTemplateId',
    'taskTemplateId',
    'createWorkflowId',
    'workflowParentId',
    'retryIterator',
    'onlyExecute',
    'debugId',
    'userId',
  ],
  task: [
    'workflowId',
    'workflowTemplateId',
    'taskTemplateId',
    'createWorkflowId',
    'workflowParentId',
    'forwardToTask',
    'retryIterator',
    'onlyExecute',
    'isCreateByOtherSystem',
    'debugId',
    'userId',
  ],
  gateway: ['workflowId', 'workflowTemplateId', 'gatewayTemplateId', 'retryIterator', 'debugId', 'userId'],
  event: ['workflowId', 'workflowTemplateId', 'eventTemplateId', 'retryIterator', 'onlyExecute', 'debugId', 'userId'],
  'task-pdf': ['documentId', 'userId'],
  'task-delayed-auto-commit': ['taskId'],
};

/**
 * Log-context extractor for a BPMN message destination.
 * @param {string} destination Logical destination name; `event.<key>` uses the `event` list.
 * @returns {function} Extractor; yields no fields for an unknown destination.
 */
export function bpmnMessageLogContext(destination: string): LogContextExtractor {
  const key = destination.startsWith('event.') ? 'event' : destination;
  const fields = Object.prototype.hasOwnProperty.call(BPMN_MESSAGE_LOG_FIELDS, key) ? BPMN_MESSAGE_LOG_FIELDS[key] : undefined;
  if (!fields) return (): LogContext => ({});
  return (payload) => pickLogFields(payload, fields);
}

/**
 * Copy of the destinations with the BPMN log-context extractor set where none is configured.
 * @param {object} destinations Logical destination name -> destination.
 * @returns {object} Destinations.
 */
export function withBpmnLogContext(destinations: Record<string, DestinationConfig>): Record<string, DestinationConfig> {
  const result: Record<string, DestinationConfig> = {};
  for (const [name, destination] of Object.entries(destinations)) {
    result[name] = destination.logContext ? { ...destination } : { ...destination, logContext: bpmnMessageLogContext(name) };
  }
  return result;
}
