import { randomUUID } from 'node:crypto';

import { pickMessageMeta } from '../lib/message_queue';
import { XmlJsConverter } from '../lib/xml_js_converter';
import { SystemNotifier } from '../lib/system_notifier';
import { WorkflowErrorModel } from '../models/workflow_error';
import { WorkflowModel } from '../models/workflow';
import { WorkflowTemplateModel } from '../models/workflow_template';
import { TaskModel } from '../models/task';
import { GatewayModel } from '../models/gateway';
import { EventModel } from '../models/event';
import { TaskEntity } from '../entities/task';
import { EventEntity } from '../entities/event';

// Constants.
const SYSTEM_USER = 'system';
const ERROR_INVALID_XML = 'Invalid XML BPMN schema.';
const ERROR_TASK_OR_WORKFLOW_NOT_FOUND = 'Task or workflow not found.';
const ERROR_GATEWAY_OR_WORKFLOW_NOT_FOUND = 'Gateway or workflow not found.';
const ERROR_EVENT_OR_WORKFLOW_NOT_FOUND = 'Event or workflow not found.';
const ERROR_INVALID_MESSAGE_OBJECT = 'Invalid message object.';
const ERROR_INVALID_ENTITY = 'Invalid entity';

// Fields of a `forwardToTask` message the task service reads (see task `createFromMessage` and `getRetryInfo`).
const isIdLike = (v) => (typeof v === 'string' && v.length > 0) || (typeof v === 'number' && Number.isFinite(v));
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v) => Array.isArray(v) && v.every((i) => typeof i === 'string');
const FORWARD_TO_TASK_FIELDS: Record<string, (v) => boolean> = {
  workflowId: isIdLike,
  workflowTemplateId: isIdLike,
  taskTemplateId: isIdLike,
  createWorkflowId: isIdLike,
  workflowParentId: isIdLike,
  userId: (v) => typeof v === 'string',
  initData: isPlainObject,
  unitIds: (v) => isPlainObject(v) || Array.isArray(v),
  performerUnits: Array.isArray,
  requiredPerformerUnits: Array.isArray,
  performerUsers: isStringArray,
  performerUsersIpn: isStringArray,
  performerUsersEmail: isStringArray,
  retryIterator: Number.isInteger,
  onlyExecute: (v) => typeof v === 'boolean',
};

/**
 * Pick the whitelisted fields of a `forwardToTask` message.
 * @param {object} messageObject AMQP message object.
 * @returns {object|undefined} Message to forward or undefined if the required `taskTemplateId` is missing or a field has a wrong type.
 */
function pickForwardToTaskMessage(messageObject: any): Record<string, unknown> | undefined {
  if (!isIdLike(messageObject?.taskTemplateId)) {
    return;
  }
  const result: Record<string, unknown> = { forwardToTask: true };
  for (const [field, isValid] of Object.entries(FORWARD_TO_TASK_FIELDS)) {
    const value = messageObject[field];
    if (value === undefined || value === null) {
      continue;
    }
    if (!isValid(value)) {
      return;
    }
    result[field] = value;
  }
  return result;
}

/**
 * Workflow business.
 * @typedef {import('../entities/workflow')} WorkflowEntity
 */
export class WorkflowBusiness {
  private static singleton: WorkflowBusiness;

  private config: any;
  private xmlJsConverter: any;
  private systemNotifier: any;
  private workflowErrorModel: any;
  private workflowModel: any;
  private workflowTemplateModel: any;
  private taskModel: any;
  private gatewayModel: any;
  private eventModel: any;
  private bpmnSchemes: any;

  /**
   * Workflow business constructor.
   * @param {object} [config] Config object.
   */
  constructor(config?) {
    // Define singleton.
    if (!WorkflowBusiness.singleton) {
      this.config = config;
      this.xmlJsConverter = new XmlJsConverter();
      this.systemNotifier = new SystemNotifier();
      this.workflowErrorModel = new WorkflowErrorModel();
      this.workflowModel = new WorkflowModel();
      this.workflowTemplateModel = new WorkflowTemplateModel();
      this.taskModel = new TaskModel();
      this.gatewayModel = new GatewayModel();
      this.eventModel = new EventModel();
      WorkflowBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowBusiness.singleton;
  }

  async init() {
    global.log.save('bpmn-schemas-initialization-started');
    const workflowTemplates = await this.workflowTemplateModel.getAll();

    this.bpmnSchemes = (await Promise.all(workflowTemplates.map((workflowTemplate) => this.parseBpmnSchema(workflowTemplate)))).filter((v) => !!v);
    global.log.save('bpmn-schemas-initialization-ends');
  }

  /**
   * Parse the BPMN schema of a workflow template.
   * @param {object} workflowTemplate Workflow template.
   * @returns {Promise<{id: number, name: string, schema: object}|undefined>} Parsed schema, or undefined when the XML is invalid.
   */
  async parseBpmnSchema(workflowTemplate) {
    try {
      const bpmnSchema = await this.xmlJsConverter.convertXmlToJsObject(workflowTemplate.xmlBpmnSchema.replace(/bpmn2:/g, 'bpmn:'));
      if (
        !bpmnSchema ||
        !bpmnSchema['bpmn:definitions'] ||
        !bpmnSchema['bpmn:definitions']['bpmn:process'] ||
        !Array.isArray(bpmnSchema['bpmn:definitions']['bpmn:process']) ||
        !bpmnSchema['bpmn:definitions']['bpmn:process'][0]
      ) {
        throw new Error(ERROR_INVALID_XML);
      }

      return { id: workflowTemplate.id, name: workflowTemplate.name, schema: bpmnSchema['bpmn:definitions']['bpmn:process'][0] };
    } catch {
      global.log.save('invalid-bpmn-schema', { workflowTemplate });
    }
  }

  /**
   * Find schema by id.
   * @param {number} id Workflow template ID.
   * @returns {Promise<object>}
   */
  async findSchemaById(id) {
    const cachedSchema = this.bpmnSchemes.find((item) => id === item.id);
    if (cachedSchema) {
      return cachedSchema;
    }

    // A workflow template imported after the last reload isn't cached yet: load it now instead of
    // failing (and dropping) the queue message until the next reload.
    let workflowTemplate;
    try {
      workflowTemplate = await this.workflowTemplateModel.findById(id);
    } catch {
      return;
    }
    if (!workflowTemplate?.isActive) {
      return;
    }

    const schema = await this.parseBpmnSchema(workflowTemplate);
    if (schema) {
      this.bpmnSchemes = [...this.bpmnSchemes.filter((item) => item.id !== id), schema];
      global.log.save('bpmn-schema-loaded-on-demand', { workflowTemplateId: id });
    }

    return schema;
  }

  /**
   * Finish workflow.
   * @param {string} workflowId Workflow ID.
   */
  async finishWorkflow(workflowId) {
    // Stop all tasks and events in progress.
    const cancelAllTasksInProgressPromise = this.taskModel.cancelAllInProgress(workflowId);
    const cancelAllEventsInProgressPromise = this.eventModel.cancelAllInProgress(workflowId);
    await Promise.all([cancelAllTasksInProgressPromise, cancelAllEventsInProgressPromise]);

    // Set workflow as final.
    await this.workflowModel.setStatusFinal(workflowId);
  }

  /**
   * Create from message.
   * @param {object} messageObject AMQP message object.
   */
  async createFromMessage(messageObject) {
    let workflowTemplateId;
    // Derived from the DB entity only (never from the message): the error path below relies on it.
    let workflowId: string | undefined;
    try {
      const currentSequences = [];
      let bpmnSchema;
      let notFinishedReason: string | undefined;

      // Find current position.
      switch (true) {
        // Only forward message to the task queue.
        case Object.prototype.hasOwnProperty.call(messageObject, 'forwardToTask'): {
          const forwardedMessage = pickForwardToTaskMessage(messageObject);
          if (!forwardedMessage) {
            global.log.save('forward-to-task-message-rejected', pickMessageMeta(messageObject));
            return true;
          }
          await global.messageQueue.produce('writingQueueTask', forwardedMessage);
          return true;
        }
        case Object.prototype.hasOwnProperty.call(messageObject, 'taskId'): {
          const taskId = messageObject.taskId;
          const task = await this.taskModel.findById(taskId);
          if (!task) {
            throw new Error(ERROR_TASK_OR_WORKFLOW_NOT_FOUND);
          }
          workflowId = task.workflowId;
          workflowTemplateId = task.workflowEntity.workflowTemplateId;
          if (task.finished !== true) {
            notFinishedReason = 'task-not-finished';
            break;
          }
          bpmnSchema = await this.findSchemaById(task.workflowEntity.workflowTemplateId);
          const sourceRef = bpmnSchema.schema['bpmn:sequenceFlow'].find(
            (item) => item['$']['sourceRef'].toLowerCase() === `task-${task.taskTemplateId}`,
          );
          if (sourceRef) {
            currentSequences.push(sourceRef);
          }

          // FIXME: Deprecated.
          // await this.setStatus(workflowId, workflowTemplateId, task);
          break;
        }
        case Object.prototype.hasOwnProperty.call(messageObject, 'gatewayId'): {
          const gatewayId = messageObject.gatewayId;
          const gateway = await this.gatewayModel.findById(gatewayId);
          if (!gateway) {
            throw new Error(ERROR_GATEWAY_OR_WORKFLOW_NOT_FOUND);
          }
          const resultSequences = gateway.data.resultSequences ? gateway.data.resultSequences : [gateway.data.resultSequence];
          workflowId = gateway.workflowId;
          workflowTemplateId = gateway.workflowEntity.workflowTemplateId;
          if (!gateway.data?.resultSequences && !gateway.data?.resultSequence) {
            notFinishedReason = 'gateway-not-finished';
            break;
          }

          bpmnSchema = await this.findSchemaById(gateway.workflowEntity.workflowTemplateId);

          for (const sequence of resultSequences) {
            const sourceRef = bpmnSchema.schema['bpmn:sequenceFlow'].find(
              (item) => item['$']['id'] === sequence && item['$']['sourceRef'].toLowerCase() === `gateway-${gateway.gatewayTemplateId}`,
            );
            if (sourceRef) {
              currentSequences.push(sourceRef);
            }
          }
          break;
        }
        case Object.prototype.hasOwnProperty.call(messageObject, 'eventId'): {
          const eventId = messageObject.eventId;
          const event = await this.eventModel.findById(eventId);
          if (!event) {
            throw new Error(ERROR_EVENT_OR_WORKFLOW_NOT_FOUND);
          }
          workflowId = event.workflowId;
          workflowTemplateId = event.workflowEntity.workflowTemplateId;
          // An event that failed with `notFailOnError` is stored with `done: false` and an error marker in
          // `data` (see the event component), and the flow must still advance after it.
          if (event.done !== true && event.data?.notFailOnError !== true) {
            notFinishedReason = 'event-not-finished';
            break;
          }

          bpmnSchema = await this.findSchemaById(event.workflowEntity.workflowTemplateId);

          // Find sequence where sourceRef is current event
          const sourceRef = bpmnSchema.schema['bpmn:sequenceFlow'].find(
            (item) => item['$']['sourceRef'].toLowerCase() === `event-${event.eventTemplateId}`,
          );
          if (sourceRef) {
            currentSequences.push(sourceRef);
            break;
          }

          // If current event is last element of the flow, push empty sequence
          currentSequences.push({ $: { id: '', sourceRef: `event-${event.eventTemplateId}`, targetRef: '' } });

          // FIXME: Deprecated.
          // await this.setStatus(workflowId, workflowTemplateId, event);
          break;
        }
        default:
          throw new Error(ERROR_INVALID_MESSAGE_OBJECT);
      }

      // Premature message: the step is not finished yet. Ack and drop it, it must not advance the flow.
      if (notFinishedReason) {
        global.log.save('workflow-message-dropped', { reason: notFinishedReason, ...pickMessageMeta(messageObject) });
        return true;
      }

      let workflow = await this.workflowModel.findById(workflowId);

      if (!workflow) {
        throw new Error(ERROR_TASK_OR_WORKFLOW_NOT_FOUND);
      }

      // Finished workflow: nothing to advance and nothing to record.
      if (workflow.isFinal !== false) {
        global.log.save('workflow-message-dropped', { reason: 'workflow-final', ...pickMessageMeta(messageObject) });
        return true;
      }

      // Save message in workflow history.
      workflow = await this.pushMessageToWorkflow(workflow.id, 'in', messageObject, currentSequences);

      // Find next position.
      if (bpmnSchema && workflowId && workflowTemplateId && workflow) {
        for (let currentSequence of currentSequences) {
          // Finished gateway.
          if (currentSequence['$']['targetRef'].search(/^gateway-[0-9]+-end$/i) !== -1) {
            const nextGatewayId = parseInt(currentSequence['$']['targetRef'].replace(/(gateway-)|(-end)/gi, ''));
            if (!nextGatewayId) {
              return;
            }

            // All sequences workflow.
            const sequences = [];
            for (const message of workflow.data.messages) {
              sequences.push(...message.sequences.map((item) => item.id));
            }

            const parallelGateway = bpmnSchema.schema['bpmn:parallelGateway'].find(
              (item) => item['$']['id'].toLowerCase() === `gateway-${nextGatewayId}-end`,
            );

            // Parallel gateway done.
            if (parallelGateway['bpmn:incoming'].every((item) => sequences.includes(item))) {
              currentSequence = bpmnSchema.schema['bpmn:sequenceFlow'].find((item) => item['$']['id'] === parallelGateway['bpmn:outgoing'][0]);
            }
          }

          // Finished workflow.
          if (currentSequence['$']['targetRef'].search(/^end.?event.+$/i) !== -1) {
            await this.finishWorkflow(workflowId);
            return true;
          }

          if (currentSequence['$']['targetRef'].search(/^task-[0-9]+$/i) !== -1) {
            const nextTaskId = parseInt(currentSequence['$']['targetRef'].replace(/task-/i, ''));
            if (!nextTaskId) {
              return;
            }

            const preparedMessageForQueue: any = {
              workflowId: workflowId,
              workflowTemplateId: workflowTemplateId,
              taskTemplateId: nextTaskId,
              userId: SYSTEM_USER,
              retryIterator: messageObject.retryIterator,
              amqpMessageId: randomUUID(),
            };

            // Debug mode.
            if (typeof messageObject.debug !== 'undefined' && typeof messageObject.debugId !== 'undefined') {
              preparedMessageForQueue.debug = messageObject.debug;
              preparedMessageForQueue.debugId = messageObject.debugId;
            }

            // Save message in workflow history.
            workflow = await this.pushMessageToWorkflow(workflow.id, 'out', preparedMessageForQueue, currentSequences);

            // Send to queue. A publish failure must not be silent: it reaches the catch below, which marks the
            // workflow as errored (recoverable via admin continue/restart) instead of leaving it stalled.
            await global.messageQueue.produce('writingQueueTask', preparedMessageForQueue);
          } else if (currentSequence['$']['targetRef'].search(/^gateway-[0-9]+$/i) !== -1) {
            const nextGatewayId = parseInt(currentSequence['$']['targetRef'].replace(/gateway-/i, ''));
            if (!nextGatewayId) {
              return;
            }

            let exclusiveGateway;
            if (bpmnSchema.schema['bpmn:exclusiveGateway']) {
              exclusiveGateway = bpmnSchema.schema['bpmn:exclusiveGateway'].find(
                (item) => item['$']['id'].toLowerCase() === `gateway-${nextGatewayId}`,
              );
            }

            let parallelGateway;
            if (bpmnSchema.schema['bpmn:parallelGateway']) {
              parallelGateway = bpmnSchema.schema['bpmn:parallelGateway'].find(
                (item) => item['$']['id'].toLowerCase() === `gateway-${nextGatewayId}`,
              );
            }

            let inclusiveGateway;
            if (bpmnSchema.schema['bpmn:inclusiveGateway']) {
              inclusiveGateway = bpmnSchema.schema['bpmn:inclusiveGateway'].find(
                (item) => item['$']['id'].toLowerCase() === `gateway-${nextGatewayId}`,
              );
            }

            const sequenceIds = [
              ...((exclusiveGateway || {})['bpmn:outgoing'] || []),
              ...((parallelGateway || {})['bpmn:outgoing'] || []),
              ...((inclusiveGateway || {})['bpmn:outgoing'] || []),
            ];

            const preparedMessageForQueue: any = {
              workflowId: workflowId,
              workflowTemplateId: workflowTemplateId,
              gatewayTemplateId: nextGatewayId,
              sequenceIds: sequenceIds,
              userId: SYSTEM_USER,
              retryIterator: messageObject.retryIterator,
              amqpMessageId: randomUUID(),
            };

            // Debug mode.
            if (typeof messageObject.debug !== 'undefined' && typeof messageObject.debugId !== 'undefined') {
              preparedMessageForQueue.debug = messageObject.debug;
              preparedMessageForQueue.debugId = messageObject.debugId;
            }

            // Save message in workflow history.
            workflow = await this.pushMessageToWorkflow(workflow.id, 'out', preparedMessageForQueue, currentSequences);

            // Send to queue. A publish failure must not be silent: it reaches the catch below, which marks the
            // workflow as errored (recoverable via admin continue/restart) instead of leaving it stalled.
            await global.messageQueue.produce('writingQueueGateway', preparedMessageForQueue);
          } else if (currentSequence['$']['targetRef'].search(/^event-[0-9]+$/i) !== -1) {
            const nextEventId = parseInt(currentSequence['$']['targetRef'].replace(/event-/i, ''));
            if (!nextEventId) {
              return;
            }

            const preparedMessageForQueue: any = {
              workflowId: workflowId,
              workflowTemplateId: workflowTemplateId,
              eventTemplateId: nextEventId,
              userId: SYSTEM_USER,
              retryIterator: messageObject.retryIterator,
              amqpMessageId: randomUUID(),
            };

            // Debug mode.
            if (typeof messageObject.debug !== 'undefined' && typeof messageObject.debugId !== 'undefined') {
              preparedMessageForQueue.debug = messageObject.debug;
              preparedMessageForQueue.debugId = messageObject.debugId;
            }

            // Save message in workflow history.
            workflow = await this.pushMessageToWorkflow(workflow.id, 'out', preparedMessageForQueue, currentSequences);

            // Send to queue. A publish failure must not be silent: it reaches the catch below, which marks the
            // workflow as errored (recoverable via admin continue/restart) instead of leaving it stalled.
            await global.messageQueue.produce('writingQueueEvent', preparedMessageForQueue);
          }
        }
      }
    } catch (error) {
      global.log.save('workflow-processing-by-message-from-queue-error', {
        ...pickMessageMeta(messageObject),
        error: { message: error && error.message, stack: error.stack },
      });

      try {
        // `workflowId` is trusted only when it was resolved from the task/event/gateway entity. The message value
        // is attacker-controllable and must never be used to mark a workflow as failed.
        await this.workflowErrorModel.create({ error: error.message, queueMessage: messageObject, workflowId });
        if (workflowId) {
          await this.workflowModel.setError(workflowId);
        }
      } catch (error) {
        global.log.save('workflow-id-not-found-error', { ...pickMessageMeta(messageObject), error: error.message });
      }

      try {
        const workflowTemplate = await this.workflowTemplateModel.findById(workflowTemplateId);
        await this.systemNotifier.sendEmails(workflowId, workflowTemplate && workflowTemplate.name, error?.message);
      } catch (error) {
        global.log.save('system-notifier-error', error.message);
      }
    }

    return true;
  }

  /**
   * Push message to workflow data.
   * @private
   * @param {string} workflowId Workflow ID.
   * @param {string} type Type.
   * @param {object} data Data.
   * @param {object[]} sequences Sequences.
   * @returns {Promise<WorkflowEntity>}
   */
  async pushMessageToWorkflow(workflowId, type, data, sequences) {
    const message = {
      type: type,
      data: data,
      sequences: sequences.map((item) => item['$']),
      createdAt: new Date().toISOString(),
    };

    return await this.workflowModel.appendMessage(workflowId, message);
  }

  /**
   * Set workflow status.
   * @private
   * @deprecated
   * @param {string} workflowId Workflow ID.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {TaskEntity|EventEntity} type Entity.
   */
  async setStatus(workflowId, workflowTemplateId, type) {
    const workflowTemplate = await this.workflowTemplateModel.findById(workflowTemplateId);
    if (!Array.isArray(workflowTemplate.data.statuses)) {
      return;
    }

    let status;

    switch (true) {
      case type instanceof TaskEntity:
        status = workflowTemplate.data.statuses.find((v) => v.taskTemplateId && v.taskTemplateId === type.taskTemplateId);
        break;
      case type instanceof EventEntity:
        status = workflowTemplate.data.statuses.find((v) => v.eventTemplateId && v.eventTemplateId === type.eventTemplateId);
        break;
      default:
        throw new Error(ERROR_INVALID_ENTITY);
    }

    if (!status || !status.statusId) {
      return;
    }

    await this.workflowModel.setStatus(workflowId, status.statusId);
  }
}
