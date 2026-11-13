import crypto, { randomUUID } from 'node:crypto';

import { getConfig, getMessageBus, getModels } from '../lib/context';
import { DESTINATION_BY_QUEUE_NAME } from '../lib/message_bus';
import { InvalidParamsError, NotFoundError } from '../lib/errors';

// Constants.
const ERROR_WRONG_QUEUE_NAME = 'Wrong queue name.';

/**
 * Workflow business.
 * @typedef {import('../entities/workflow_error')} WorkflowErrorEntity
 */
export class WorkflowHandlerBusiness {
  private static singleton: WorkflowHandlerBusiness;

  public config: any;
  private defaultDebugRepeats: number[];
  private debugModeEnabled: boolean;
  private debugRepeats: number[];

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?: any) {
    // Define singleton.
    if (!WorkflowHandlerBusiness.singleton) {
      this.config = config;
      this.defaultDebugRepeats = [1, 2, 2, 5, 10];

      const workflowEditorConfig = getConfig()?.workflow_editor;
      const debugModeConfig = workflowEditorConfig?.debugMode;

      this.debugModeEnabled = debugModeConfig?.enabled === true;
      this.debugRepeats =
        Array.isArray(debugModeConfig?.repeats) && debugModeConfig.repeats.length > 0 ? debugModeConfig.repeats : this.defaultDebugRepeats;

      WorkflowHandlerBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowHandlerBusiness.singleton;
  }

  /**
   * Get error messages.
   * @returns {Promise<WorkflowErrorEntity[]>}
   */
  async getErrorMessages() {
    return await getModels().workflowError.getAll();
  }

  /**
   * Find by id.
   * @param {number} id ID.
   * @returns {Promise<WorkflowErrorEntity>}
   */
  async findById(id) {
    return await getModels().workflowError.findById(id);
  }

  /**
   * Delete by id.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    if ((await getModels().workflowError.deleteById(id)) === 0) {
      return false;
    }

    return true;
  }

  /**
   * Push in queue.
   * @param {string} name Name queue.
   * @param {object} message Queue message.
   */
  async pushInQueue(name, message) {
    if (!Object.prototype.hasOwnProperty.call(DESTINATION_BY_QUEUE_NAME, name)) {
      throw new Error(ERROR_WRONG_QUEUE_NAME);
    }
    const destination = DESTINATION_BY_QUEUE_NAME[name as keyof typeof DESTINATION_BY_QUEUE_NAME];

    if (typeof message.debug !== 'undefined' && message.debug === true) {
      message.debugId = crypto.randomBytes(16).toString('hex');
    }

    // Replace/Create new amqp message id.
    message.amqpMessageId = randomUUID();

    await getMessageBus()!.publish(destination, message, { messageId: message.amqpMessageId });

    if (message.debug === true) {
      if (this.debugModeEnabled === false) {
        return { error: 'Debug mode is disabled.' };
      }

      let debug;
      for (let i = 0; i < this.debugRepeats.length; i++) {
        // Wait response.
        await new Promise((resolve) => setTimeout(resolve, this.debugRepeats[i] * 1000));

        debug = await getModels().workflowDebug.findById(message.debugId);
        if (debug && debug.data) {
          break;
        }
      }

      return (debug && debug.data) || { error: 'Result timeout.' };
    }
  }

  /**
   * Assert that the message belongs to the workflow from the URL.
   * @param {string} workflowId Workflow ID.
   * @param {object} message Queue message.
   */
  async assertMessageBelongsToWorkflow(workflowId, message) {
    const workflow = await getModels().workflow.findById(workflowId);
    if (!workflow) {
      throw new NotFoundError('Workflow not found.');
    }

    if (message?.workflowId !== undefined && message?.workflowId !== null && String(message.workflowId) !== String(workflowId)) {
      throw new InvalidParamsError('Message workflowId does not match the workflow in the URL.');
    }

    await this.assertMessageReferences(workflowId, message);
  }

  /**
   * Assert that referenced entities exist and belong to the workflow, and that the message references a workflow.
   * @param {string} workflowId Expected workflow ID. When empty, the workflow of the first referenced entity is used.
   * @param {object} message Queue message.
   */
  async assertMessageReferences(workflowId, message) {
    const hasWorkflowId = message?.workflowId !== undefined && message?.workflowId !== null;
    let expectedWorkflowId = workflowId;
    let hasEntityKey = false;

    for (const [key, name] of [
      ['taskId', 'task'],
      ['eventId', 'event'],
      ['gatewayId', 'gateway'],
    ]) {
      const id = message?.[key];
      if (id === undefined || id === null) {
        continue;
      }
      hasEntityKey = true;

      let entity;
      try {
        entity = typeof id === 'string' || typeof id === 'number' ? await getModels()[name].findById(id) : undefined;
      } catch {
        entity = undefined;
      }
      if (!entity) {
        throw new InvalidParamsError(`Referenced ${name} not found.`);
      }

      if (expectedWorkflowId === undefined || expectedWorkflowId === null) {
        expectedWorkflowId = entity.workflowId;
      }
      if (String(entity.workflowId) !== String(expectedWorkflowId)) {
        throw new InvalidParamsError(`Referenced ${name} does not belong to the workflow in the URL.`);
      }
    }

    if (!hasWorkflowId && !hasEntityKey) {
      throw new InvalidParamsError('Message must reference the workflow: workflowId, taskId, eventId or gatewayId is required.');
    }
  }

  /**
   * Define queue name.
   * @param {object} queueMessage Queue message object.
   * @returns {'writingQueueManager'|'writingQueueTask'|'writingQueueEvent'|'writingQueueGateway'} Queue name.
   */
  defineQueueName(queueMessage) {
    // Check task, event, gateway.
    if (queueMessage.taskTemplateId) {
      return 'writingQueueTask';
    }
    if (queueMessage.eventTemplateId) {
      return 'writingQueueEvent';
    }
    if (queueMessage.gatewayTemplateId) {
      return 'writingQueueGateway';
    }

    // Manager in other cases.
    return 'writingQueueManager';
  }
}
