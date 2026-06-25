import crypto, { randomUUID } from 'node:crypto';

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

      const workflowEditorConfig = global.config?.workflow_editor;
      const debugModeConfig = workflowEditorConfig?.debugMode;

      this.debugModeEnabled = debugModeConfig?.enabled === true;
      this.debugRepeats = Array.isArray(debugModeConfig?.repeats) && debugModeConfig.repeats.length > 0
        ? debugModeConfig.repeats
        : this.defaultDebugRepeats;

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
    return await global.models.workflowError.getAll();
  }

  /**
   * Find by id.
   * @param {number} id ID.
   * @returns {Promise<WorkflowErrorEntity>}
   */
  async findById(id) {
    return await global.models.workflowError.findById(id);
  }

  /**
   * Delete by id.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    if ((await global.models.workflowError.deleteById(id)) === 0) {
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
    if (name !== 'writingQueueManager' && name !== 'writingQueueTask' && name !== 'writingQueueEvent' && name !== 'writingQueueGateway') {
      throw new Error(ERROR_WRONG_QUEUE_NAME);
    }

    if (typeof message.debug !== 'undefined' && message.debug === true) {
      message.debugId = crypto.randomBytes(16).toString('hex');
    }

    // Replace/Create new amqp message id.
    message.amqpMessageId = randomUUID();

    global.messageQueue.produce(name, message);

    if (message.debug === true) {
      if (this.debugModeEnabled === false) {
        return { error: 'Debug mode is disabled.' };
      }

      let debug;
      for (let i = 0; i < this.debugRepeats.length; i++) {
        // Wait response.
        await new Promise((resolve) => setTimeout(resolve, this.debugRepeats[i] * 1000));

        debug = await global.models.workflowDebug.findById(message.debugId);
        if (debug && debug.data) {
          break;
        }
      }

      return (debug && debug.data) || { error: 'Result timeout.' };
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
      global.log.save('message-to-writingQueueGateway', { queueMessage }); // TODO: remove it later.
      return 'writingQueueGateway';
    }

    // Manager in other cases.
    return 'writingQueueManager';
  }
}
