
const WorkflowLoggerRecordEntity = require('./entities/workflow_logger_record');
const WorkflowLoggerEntity = require('./entities/workflow_logger');
const { ForbiddenError, NotFoundError } = require('../../lib/errors');
const { ERROR_WORKFLOW_NOT_FOUND } = require('../../constants/error');

// Constants.
const ROLE_ADMIN = 'admin';
const ERROR_ROLE_ADMIN = 'User doesn\'t have role admin.';

/**
 * Workflow logger service.
 */
class WorkflowLoggerService {
  /**
   * Workflow logger service constructor.
   */
  constructor() {
    // Singleton.
    if (!WorkflowLoggerService.singleton) {
      // Define singleton.
      WorkflowLoggerService.singleton = this;
    }

    // Return singleton.
    return WorkflowLoggerService.singleton;
  }

  /**
   * Find logs workflow by ID.
   * @param {string} id Workflow ID.
   * @param {string[]} [userRoles] User roles.
   * @returns {Promise<object[]>}
   */
  async findById(id, userRoles) {
    // Access only for role admin.
    if (Array.isArray(userRoles) && !userRoles.some((v) => v === ROLE_ADMIN)) {
      throw new ForbiddenError(ERROR_ROLE_ADMIN);
    }

    const workflow = await models.workflow.findById(id, {
      with: ['tasks', 'events', 'gateways', 'workflowErrors', 'workflowRestarts']
    });
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    const workflowLoggerEntity = new WorkflowLoggerEntity(id);

    const workflowMessages = workflow.data.messages || [];
    for (const workflowMessage of workflowMessages) {
      let type;
      if (workflowMessage.type === 'in') {
        type = 'workflow_incoming_message';
      } else if (workflowMessage.type === 'out') {
        type = 'workflow_outgoing_message';
      } else {
        continue;
      }

      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type,
          details: {
            data: workflowMessage.data,
            sequences: workflowMessage.sequences
          },
          createdAt: workflowMessage.createdAt,
          updatedAt: workflowMessage.createdAt
        })
      );
    }

    for (const task of workflow.tasks) {
      let warnings = [];
      if (task.performerUsers.length === 0 && task.performerUnits.length === 0 && task.requiredPerformerUnits.length === 0) {
        warnings.push({
          message: 'Fields performerUsers and performerUnits are empty.'
        });
      }

      if (!task.name) {
        const taskTemplate = await models.taskTemplate.findById(
          task.taskTemplateId
        );
        if (taskTemplate && taskTemplate.name) {
          task.name = taskTemplate.name;
        }
      }

      const document = await models.document.findById(task.documentId);
      if (document) {
        // Add document.
        task.document = document;

        // Append attachments.
        const attachments = await models.documentAttachment.getByDocumentId(document.id);
        task.document.attachments = attachments;

        // Append document signature.
        const signatures = await models.documentSignature.getByDocumentId(document.id);
        task.document.signatures = signatures;
      }

      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'task',
          warnings,
          details: task,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        })
      );
    }

    for (const event of workflow.events) {
      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'event',
          details: event,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        })
      );
    }

    for (const gateway of workflow.gateways) {
      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'gateway',
          details: gateway,
          createdAt: gateway.createdAt,
          updatedAt: gateway.updatedAt
        })
      );
    }

    for (const workflowError of workflow.workflowErrors) {
      if (
        workflowError.data &&
        workflowError.data.queueMessage &&
        workflowError.data.queueMessage.taskTemplateId
      ) {
        const taskTemplate = await models.taskTemplate.findById(
          workflowError.data.queueMessage.taskTemplateId
        );
        if (taskTemplate && taskTemplate.name) {
          workflowError.name = taskTemplate.name;
        }
      } else if (
        workflowError.data &&
        workflowError.data.queueMessage &&
        workflowError.data.queueMessage.eventTemplateId
      ) {
        const eventTemplate = await models.eventTemplate.findById(
          workflowError.data.queueMessage.eventTemplateId
        );
        if (eventTemplate && eventTemplate.name) {
          workflowError.name = eventTemplate.name;
        }
      } else if (
        workflowError.data &&
        workflowError.data.queueMessage &&
        workflowError.data.queueMessage.gatewayTemplateId
      ) {
        const gatewayTemplate = await models.gatewayTemplate.findById(
          workflowError.data.queueMessage.gatewayTemplateId
        );
        if (gatewayTemplate && gatewayTemplate.name) {
          workflowError.name = gatewayTemplate.name;
        }
      }

      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: workflowError.type,
          details: workflowError,
          createdAt: workflowError.createdAt,
          updatedAt: workflowError.updatedAt
        })
      );
    }

    for (const workflowRestart of workflow.workflowRestarts) {
      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'restart',
          details: workflowRestart,
          createdAt: workflowRestart.createdAt,
          updatedAt: workflowRestart.updatedAt
        })
      );
    }

    workflowLoggerEntity.sortLogs();

    return workflowLoggerEntity;
  }
}

module.exports = WorkflowLoggerService;
