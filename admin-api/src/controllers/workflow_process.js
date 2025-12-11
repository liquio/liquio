const { matchedData } = require('express-validator');
const axios = require('axios');

const Controller = require('./controller');
const WorkflowProcessBusiness = require('../businesses/workflow_process');
const WorkflowBusiness = require('../businesses/workflow');
const WorkflowHandlerBusiness = require('../businesses/workflow_handler');
const Exceptions = require('../exceptions');
const WorkflowRestartEntity = require('../entities/workflow_restart');

/**
 * Workflow process controller.
 */
class WorkflowProcessController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowProcessController.singleton) {
      super(config);
      this.workflowProcessBusiness = new WorkflowProcessBusiness(config);
      this.workflowHandlerBusiness = new WorkflowHandlerBusiness();
      this.workflowBusiness = new WorkflowBusiness();
      WorkflowProcessController.singleton = this;
    }
    return WorkflowProcessController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};

    const { page, count, brief_info: briefInfo = false } = queryData;

    let workflowProcesses;
    try {
      workflowProcesses = await this.workflowProcessBusiness.getAll({
        page,
        count,
        sort: sort,
        filters: filters,
        briefInfo,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, workflowProcesses, true);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let workflowProcess;

    try {
      workflowProcess = await this.workflowProcessBusiness.findById(id);
      if (!workflowProcess) {
        throw new Exceptions.NOT_FOUND();
      }
      const lastWorkflowHistory = await this.workflowBusiness.findLastWorkflowHistoryByWorkflowTemplateId(workflowProcess.workflowTemplateId);
      if (lastWorkflowHistory && lastWorkflowHistory.id) {
        res.setHeader('Last-Workflow-History-Id', lastWorkflowHistory.id);
      }
      workflowProcess = this.filterResponse(workflowProcess);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, workflowProcess);
  }

  /**
   * Continue process.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async continueProcess(req, res) {
    // Define params.
    const { id: workflowId } = matchedData(req, { locations: ['params'] });

    // Get workflow errors for workflow.
    let workflowErrors;
    try {
      workflowErrors = await global.models.workflowError.getByWorkflowId(workflowId, ['event', 'gateway', 'manager']);
    } catch (error) {
      log.save('get-workflow-errors-error', { error: error && error.message });
    }

    // Check workflow errors.
    if (!workflowErrors || workflowErrors.length === 0) {
      return this.responseError(res, Exceptions.NOT_FOUND.Messages.WORKFLOW_ERROR, 404);
    }

    // Define queue message.
    const [workflowError] = workflowErrors;
    const { data: { queueMessage } = {} } = workflowError;

    // Re-push queue message.
    try {
      const queueName = this.workflowHandlerBusiness.defineQueueName(queueMessage);
      await this.workflowHandlerBusiness.pushInQueue(queueName, queueMessage);
      await models.workflow.resolveError(workflowId);

      const user = this.getRequestUserBaseInfo(req);
      await models.workflowRestart.create(
        new WorkflowRestartEntity({
          workflowId,
          workflowErrorId: workflowError.id,
          type: 'error',
          data: { user },
        }),
      );
    } catch (error) {
      return this.responseError(res, error);
    }
    this.responseThatAccepted(res);
  }

  /**
   * Continue process bulk.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async continueProcessBulk(req, res) {
    // Define params.
    const { workflowIds } = matchedData(req, { locations: ['body'] });

    for (const workflowId of workflowIds) {
      // Get workflow errors for workflow.
      let workflowErrors;
      try {
        workflowErrors = await global.models.workflowError.getByWorkflowId(workflowId, ['event', 'gateway', 'manager']);
      } catch (error) {
        log.save('get-workflow-errors-error', { error: error && error.message });
      }

      // Check workflow errors.
      if (!workflowErrors || workflowErrors.length === 0) {
        continue;
      }

      // Define queue message.
      const [workflowError] = workflowErrors;
      const { data: { queueMessage } = {} } = workflowError;

      // Re-push queue message.
      try {
        const queueName = this.workflowHandlerBusiness.defineQueueName(queueMessage);
        await this.workflowHandlerBusiness.pushInQueue(queueName, queueMessage);
        await models.workflow.resolveError(workflowId);

        const user = this.getRequestUserBaseInfo(req);
        await models.workflowRestart.create(
          new WorkflowRestartEntity({
            workflowId,
            workflowErrorId: workflowError.id,
            type: 'error',
            data: { user },
          }),
        );
      } catch (error) {
        return this.responseError(res, error);
      }
    }
    this.responseThatAccepted(res);
  }

  /**
   * Restart process from step.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async restartProcessFromStep(req, res) {
    // Define params.
    const { id: workflowId } = matchedData(req, { locations: ['params'] });
    const bodyData = matchedData(req, { locations: ['body'] });
    const { message } = bodyData;
    const { resolve_error } = matchedData(req, { locations: ['query'] });

    let response;

    // Push message to queue.
    try {
      const queueName = this.workflowHandlerBusiness.defineQueueName(message);

      response = await this.workflowHandlerBusiness.pushInQueue(queueName, message); // Response only when enabled debug mode.

      // If disabled debug mode.
      if (typeof message.debug === 'undefined' || message.debug === false) {
        await models.workflow.setStatusFinal(workflowId, false);

        const user = this.getRequestUserBaseInfo(req);
        await models.workflowRestart.create(
          new WorkflowRestartEntity({
            workflowId,
            type: 'manual',
            data: { user },
          }),
        );
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    // Set "has_unresolved_errors: false" if passed "resolve_error: true" param.
    if (resolve_error) {
      try {
        await this.workflowProcessBusiness.update(workflowId, { hasUnresolvedErrors: false });
      } catch (error) {
        return this.responseError(res, error);
      }
    }
    if (response) {
      return this.responseData(res, response);
    }
    this.responseThatAccepted(res);
  }

  /**
   * Restart process from step bulk.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async restartProcessFromStepBulk(req, res) {
    // Define params.
    const { messages } = matchedData(req, { locations: ['body'] });

    // Push messages to queue.
    for (const message of messages) {
      try {
        // Define message options.
        const { _taskId, _status, _statusTaskTemplateId, workflowId } = message;
        let calculatedWorkflowId = workflowId;
        if (_taskId || _status || _statusTaskTemplateId) {
          calculatedWorkflowId = await this.workflowProcessBusiness.setStatusAndGetWorkflowId({
            taskId: _taskId,
            status: _status,
            statusTaskTemplateId: _statusTaskTemplateId,
          });
        }

        // Handle message.
        let normalizedMessage = {
          ...message,
          workflowId: calculatedWorkflowId,
        };
        const queueName = this.workflowHandlerBusiness.defineQueueName(normalizedMessage);
        await this.workflowHandlerBusiness.pushInQueue(queueName, normalizedMessage);
        log.save('restart-process-from-step-bulk-message-handled', { message: normalizedMessage });
      } catch (error) {
        log.save('restart-process-from-step-bulk-message-error', { error: error && error.message, message });
      }
    }

    // Response 202.
    this.responseThatAccepted(res);
  }

  /**
   * Clear the process that has been called more than twice from the same events and gateways.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async clearProcess(req, res) {
    const { id: workflowId } = matchedData(req, { locations: ['params'] });

    try {
      await this.workflowProcessBusiness.clearProcess(workflowId);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const bodyData = matchedData(req, { locations: ['body'] });

    try {
      await this.workflowProcessBusiness.update(id, bodyData);
    } catch (error) {
      return this.responseError(res, error);
    }
    this.responseThatAccepted(res);
  }

  /**
   * Get tasks.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getTasks(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};
    const { page: currentPage, count: perPage } = queryData;

    let tasks;
    try {
      tasks = await this.workflowProcessBusiness.getTasks({
        currentPage,
        perPage,
        sort,
        filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, tasks, true);
  }

  /**
   * Get users with access to tasks.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUsersWithAccessToTasks(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};
    const { page, count } = queryData;

    let users;
    try {
      users = await this.workflowProcessBusiness.getUsersWithAccessToTasks({
        page,
        count,
        sort,
        filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, users, true);
  }

  /**
   * Update task.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateTask(req, res) {
    const { taskId } = matchedData(req, { locations: ['params'] });
    const bodyData = matchedData(req, { locations: ['body'] });

    try {
      await this.workflowProcessBusiness.updateTask(taskId, bodyData);
    } catch (error) {
      return this.responseError(res, error);
    }
    this.responseThatAccepted(res);
  }

  /**
   * Cancel event.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async cancelEvent(req, res) {
    const { id, eventId } = matchedData(req, { locations: ['params'] });

    try {
      await this.workflowProcessBusiness.cancelEvent(id, eventId);
    } catch (error) {
      return this.responseError(res, error);
    }
    this.responseThatAccepted(res);
  }

  /**
   * Download file.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async downloadFile(req, res) {
    const { fileId } = matchedData(req, { locations: ['params'] });

    let downloadFileRequestOptions;
    try {
      downloadFileRequestOptions = await this.workflowProcessBusiness.downloadFileRequestOptions(fileId);
    } catch (error) {
      return this.responseError(res, error);
    }

    try {
      const response = await axios({
        ...downloadFileRequestOptions,
        responseType: 'stream',
        validateStatus: () => true // Always resolve, handle status manually
      });
      if (response.status >= 400) {
        res.status(response.status).send(response.data);
        return;
      }
      response.data.pipe(res);
    } catch (error) {
      // Axios network or config error
      return this.responseError(res, error);
    }
  }

  /**
   * Download p7s.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async downloadP7s(req, res) {
    // Define params.
    const { id: taskId, fileId } = matchedData(req, { locations: ['params'] });
    const { as_file: asFile, as_base64: asBase64 } = matchedData(req, { locations: ['query'] });

    // Try to download P7S.
    let p7s;
    try {
      // Get P7S with readable stream.
      p7s = await this.workflowProcessBusiness.downloadP7s(fileId, asFile, asBase64);
    } catch (error) {
      // Response if not found.
      if (error.cause?.response === '404 Not Found') {
        try {
          // Handle if task ID not defined.
          if (!taskId) {
            return this.responseError(
              res,
              {
                message: error.cause?.response || 'P7S not found.',
              },
              404,
            );
          }

          // Handle if task ID defined.
          const task = await models.task.findById(taskId);
          const documentTemplate = await models.documentTemplate.findById(task.taskTemplateId);
          if (documentTemplate.jsonSchema?.isP7sSign !== true) {
            return this.responseError(
              res,
              {
                message: error.cause?.response || 'P7S not found.',
              },
              404,
              [{ message: 'This document does not provide a P7S' }],
            );
          }
        } catch {
          // Default 404 error.
          return this.responseError(
            res,
            {
              message: error.cause?.response || 'P7S not found.',
            },
            404,
          );
        }
      }

      // Respone error.
      return this.responseError(res, { message: error.cause?.response });
    }

    // Response P7S.
    p7s.dataType && res.setHeader('Content-Type', p7s.dataType);
    p7s.dataLength && res.setHeader('Content-Length', p7s.dataLength);
    p7s.readableStream.pipe(res);
  }

  /**
   * Delete signatures.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteAllSignaturesFromDocument(req, res) {
    const { id: workflowId, documentId } = matchedData(req, { locations: ['params'] });
    const initiator = this.getRequestUserBaseInfo(req);
    let deletingResult;
    try {
      deletingResult = await this.workflowProcessBusiness.deleteAllSignaturesFromDocument({ workflowId, documentId, initiator });
    } catch (error) {
      return this.responseError(res, error);
    }
    this.responseData(res, deletingResult);
  }
}

module.exports = WorkflowProcessController;
