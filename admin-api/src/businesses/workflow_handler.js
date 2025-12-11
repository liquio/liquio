const crypto = require('crypto');
const uuid = require('uuid-random');

// Constants.
const ERROR_WRONG_QUEUE_NAME = 'Wrong queue name.';

/**
 * Workflow business.
 * @typedef {import('../entities/workflow_error')} WorkflowErrorEntity
 */
class WorkflowHandlerBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowHandlerBusiness.singleton) {
      this.config = config;
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
    return await models.workflowError.getAll();
  }

  /**
   * Find by id.
   * @param {number} id ID.
   * @returns {Promise<WorkflowErrorEntity>}
   */
  async findById(id) {
    return await models.workflowError.findById(id);
  }

  /**
   * Delete by id.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    if ((await models.workflowError.deleteById(id)) === 0) {
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
    message.amqpMessageId = uuid();

    global.messageQueue.produce(name, message);

    if (config.workflow_editor.debugMode && typeof message.debug !== 'undefined' && message.debug === true) {
      if (config.workflow_editor.debugMode.enabled === false) {
        return { error: 'Debug mode is disabled.' };
      }

      let repeat = config.workflow_editor.debugMode.repeats.length;
      let debug;
      for (let i = 0; i < repeat; i++) {
        // Wait response.
        await new Promise((resolve) => setTimeout(resolve, config.workflow_editor.debugMode.repeats[i] * 1000));

        debug = await models.workflowDebug.findById(message.debugId);
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
      log.save('message-to-writingQueueGateway', { queueMessage }); // TODO: remove it later.
      return 'writingQueueGateway';
    }

    // Manager in other cases.
    return 'writingQueueManager';
  }
}

module.exports = WorkflowHandlerBusiness;
