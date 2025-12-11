const uuid = require('uuid-random');

const XmlJsConverter = require('../lib/xml_js_converter');
const SystemNotifier = require('../lib/system_notifier');
const WorkflowErrorModel = require('../models/workflow_error');
const WorkflowModel = require('../models/workflow');
const WorkflowTemplateModel = require('../models/workflow_template');
const TaskModel = require('../models/task');
const GatewayModel = require('../models/gateway');
const EventModel = require('../models/event');
const TaskEntity = require('../entities/task');
const EventEntity = require('../entities/event');

// Constants.
const SYSTEM_USER = 'system';
const ERROR_INVALID_XML = 'Invalid XML BPMN schema.';
const ERROR_TASK_OR_WORKFLOW_NOT_FOUND = 'Task or workflow not found.';
const ERROR_GATEWAY_OR_WORKFLOW_NOT_FOUND = 'Gateway or workflow not found.';
const ERROR_EVENT_OR_WORKFLOW_NOT_FOUND = 'Event or workflow not found.';
const ERROR_INVALID_MESSAGE_OBJECT = 'Invalid message object.';
const ERROR_INVALID_ENTITY = 'Invalid entity';

/**
 * Workflow business.
 * @typedef {import('../entities/workflow')} WorkflowEntity
 */
class WorkflowBusiness {
  /**
   * Workflow business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
    log.save('bpmn-schemas-initialization-started');
    const workflowTemplates = await this.workflowTemplateModel.getAll();

    this.bpmnSchemes = (
      await Promise.all(
        workflowTemplates.map(async (workflowTemplate) => {
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
            log.save('invalid-bpmn-schema', { workflowTemplate });
          }
        }),
      )
    ).filter((v) => !!v);
    log.save('bpmn-schemas-initialization-ends');
  }

  /**
   * Find schema by id.
   * @param {number} id Workflow template ID.
   * @returns {Promise<object>}
   */
  async findSchemaById(id) {
    return this.bpmnSchemes.find((item) => id === item.id);
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
    try {
      let workflowId;
      let currentSequences = [];
      let bpmnSchema;

      // Find current position.
      switch (true) {
        // Only forward message to the task queue.
        case Object.prototype.hasOwnProperty.call(messageObject, 'forwardToTask'): {
          global.messageQueue.produce('writingQueueTask', messageObject);
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

      let workflow = await this.workflowModel.findById(workflowId);

      // Save message in workflow history.
      workflow = await this.pushMessageToWorkflow(workflow.id, 'in', messageObject, currentSequences);

      // Find next position.
      if (bpmnSchema && workflowId && workflowTemplateId && workflow && workflow.isFinal === false) {
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

            const preparedMessageForQueue = {
              workflowId: workflowId,
              workflowTemplateId: workflowTemplateId,
              taskTemplateId: nextTaskId,
              userId: SYSTEM_USER,
              retryIterator: messageObject.retryIterator,
              amqpMessageId: uuid(),
            };

            // Debug mode.
            if (typeof messageObject.debug !== 'undefined' && typeof messageObject.debugId !== 'undefined') {
              preparedMessageForQueue.debug = messageObject.debug;
              preparedMessageForQueue.debugId = messageObject.debugId;
            }

            // Save message in workflow history.
            workflow = await this.pushMessageToWorkflow(workflow.id, 'out', preparedMessageForQueue, currentSequences);

            // Send to queue.
            global.messageQueue.produce('writingQueueTask', preparedMessageForQueue);
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

            const preparedMessageForQueue = {
              workflowId: workflowId,
              workflowTemplateId: workflowTemplateId,
              gatewayTemplateId: nextGatewayId,
              sequenceIds: sequenceIds,
              userId: SYSTEM_USER,
              retryIterator: messageObject.retryIterator,
              amqpMessageId: uuid(),
            };

            // Debug mode.
            if (typeof messageObject.debug !== 'undefined' && typeof messageObject.debugId !== 'undefined') {
              preparedMessageForQueue.debug = messageObject.debug;
              preparedMessageForQueue.debugId = messageObject.debugId;
            }

            // Save message in workflow history.
            workflow = await this.pushMessageToWorkflow(workflow.id, 'out', preparedMessageForQueue, currentSequences);

            // Send to queue.
            global.messageQueue.produce('writingQueueGateway', preparedMessageForQueue);
          } else if (currentSequence['$']['targetRef'].search(/^event-[0-9]+$/i) !== -1) {
            const nextEventId = parseInt(currentSequence['$']['targetRef'].replace(/event-/i, ''));
            if (!nextEventId) {
              return;
            }

            const preparedMessageForQueue = {
              workflowId: workflowId,
              workflowTemplateId: workflowTemplateId,
              eventTemplateId: nextEventId,
              userId: SYSTEM_USER,
              retryIterator: messageObject.retryIterator,
              amqpMessageId: uuid(),
            };

            // Debug mode.
            if (typeof messageObject.debug !== 'undefined' && typeof messageObject.debugId !== 'undefined') {
              preparedMessageForQueue.debug = messageObject.debug;
              preparedMessageForQueue.debugId = messageObject.debugId;
            }

            // Save message in workflow history.
            workflow = await this.pushMessageToWorkflow(workflow.id, 'out', preparedMessageForQueue, currentSequences);

            // Send to queue.
            global.messageQueue.produce('writingQueueEvent', preparedMessageForQueue);
          }
        }
      }
    } catch (error) {
      log.save('workflow-processing-by-message-from-queue-error', { messageObject, error: { message: error && error.message, stack: error.stack } });

      try {
        await this.workflowErrorModel.create({ error: error.message, queueMessage: messageObject });
        await this.workflowModel.setError(messageObject.workflowId);
      } catch (error) {
        log.save('workflow-id-not-found-error', { messageObject, error: error.message });
      }

      try {
        const workflowTemplate = await this.workflowTemplateModel.findById(workflowTemplateId);
        await this.systemNotifier.sendEmails(messageObject.workflowId, workflowTemplate && workflowTemplate.name, error?.message);
      } catch (error) {
        log.save('system-notifier-error', error.message);
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

module.exports = WorkflowBusiness;
