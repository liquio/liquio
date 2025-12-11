const axios = require('axios');
const { default: Queue } = require('queue');

const Exceptions = require('../exceptions');
const WorkflowLoggerEntity = require('../entities/workflow_log/workflow_logger');
const WorkflowLoggerRecordEntity = require('../entities/workflow_log/workflow_logger_record');

const USER_ID_LENGHT_LIMIT = 20;

const PROCESS_TIMEOUT = 60 * 1000;

/**
 * Workflow log business.
 */
class WorkflowLogBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowLogBusiness.singleton) {
      this.config = config;
      WorkflowLogBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowLogBusiness.singleton;
  }

  /**
   * Get workflow logs by workflow ID.
   * @param {string} id Workflow ID.
   * @returns {Promise<object[]>}
   */
  async getByWorkflowId(id, params = {}) {
     
    const modelsInstance = params?.useSlaveDBInstance && global.slaveModels ? global.slaveModels : models;

    const workflow = await modelsInstance.workflow.findById(id, {
      with: ['tasks', 'events', 'gateways', 'workflowErrors', 'workflowRestarts'],
    });

    if (!workflow) {
      throw new Exceptions.NOT_FOUND(Exceptions.NOT_FOUND.Messages.WORKFLOW);
    }

    const workflowLoggerEntity = new WorkflowLoggerEntity(id);

    const workflowMessages = workflow.data.messages || [];
    for (const workflowMessage of workflowMessages) {
      let type = '';
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
            sequences: workflowMessage.sequences,
          },
          createdAt: workflowMessage.createdAt,
          updatedAt: workflowMessage.createdAt,
        }),
      );
    }

    for (const task of workflow.tasks) {
      let warnings = [];
      if (task.performerUsers.length === 0 && task.performerUnits.length === 0) {
        warnings.push({
          message: 'Fields performerUsers and performerUnits are empty.',
        });
      }

      if (!task.name) {
        const taskTemplate = await modelsInstance.taskTemplate.findById(task.taskTemplateId);
        if (taskTemplate && taskTemplate.name) {
          task.name = taskTemplate.name;
        }
      }

      const document = await modelsInstance.document.findById(task.documentId);
      if (document) {
        // Add document.
        task.document = document;

        // Append attachments.
        const attachments = await modelsInstance.documentAttachment.getByDocumentId(document.id);
        task.document.attachments = attachments;

        // Append document signature.
        const signatures = await modelsInstance.documentSignature.getByDocumentId(document.id);
        task.document.signatures = signatures;
      }

      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'task',
          warnings,
          details: task,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }),
      );
    }

    for (const event of workflow.events) {
      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'event',
          details: event,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        }),
      );
    }

    for (const gateway of workflow.gateways) {
      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'gateway',
          details: gateway,
          createdAt: gateway.createdAt,
          updatedAt: gateway.updatedAt,
        }),
      );
    }

    for (const workflowError of workflow.workflowErrors) {
      if (workflowError.data && workflowError.data.queueMessage && workflowError.data.queueMessage.taskTemplateId) {
        const taskTemplate = await modelsInstance.taskTemplate.findById(workflowError.data.queueMessage.taskTemplateId);
        if (taskTemplate && taskTemplate.name) {
          workflowError.name = taskTemplate.name;
        }
      } else if (workflowError.data && workflowError.data.queueMessage && workflowError.data.queueMessage.eventTemplateId) {
        const eventTemplate = await modelsInstance.eventTemplate.findById(workflowError.data.queueMessage.eventTemplateId);
        if (eventTemplate && eventTemplate.name) {
          workflowError.name = eventTemplate.name;
        }
      } else if (workflowError.data && workflowError.data.queueMessage && workflowError.data.queueMessage.gatewayTemplateId) {
        const gatewayTemplate = await modelsInstance.gatewayTemplate.findById(workflowError.data.queueMessage.gatewayTemplateId);
        if (gatewayTemplate && gatewayTemplate.name) {
          workflowError.name = gatewayTemplate.name;
        }
      }

      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: workflowError.type,
          details: workflowError,
          createdAt: workflowError.createdAt,
          updatedAt: workflowError.updatedAt,
        }),
      );
    }

    for (const workflowRestart of workflow.workflowRestarts) {
      workflowLoggerEntity.addLog(
        new WorkflowLoggerRecordEntity({
          type: 'restart',
          details: workflowRestart,
          createdAt: workflowRestart.createdAt,
          updatedAt: workflowRestart.updatedAt,
        }),
      );
    }

    workflowLoggerEntity.sortLogs();

    return workflowLoggerEntity;
  }

  /**
   *
   * @param {WorkflowEntity[]} processes
   */
  async reindexWorkflowProcesses(processes) {
    //processing portion of data
    //Get logs for each workflow and save to elastic

    return new Promise((resolve, reject) => {
      const queue = Queue({ concurrency: global.config.elastic?.reindexQueueConcurrency || 10 });

      queue.timeout = PROCESS_TIMEOUT;

      queue.on('timeout', function (next, job) {
        log.save('reindex-workflow-processes|job-timeout', { job }, 'error');
      });

      queue.on('error', reject);
      queue.on('end', resolve);

      for (const processIndex in processes) {
        queue.push(
          async () =>
            await this.reindexWorkflowProcess(processes[processIndex], {
              processesLength: processes.length,
              processIndex,
            }),
        );
      }

      queue.start((error) => {
        if (error) {
          log.save('reindex-workflow-processes|job-error', { error: error?.message }, 'error');
          return reject(error);
        }
        log.save('reindex-workflow-processes|job-done', { error: error?.message }, 'info');
      });
    });
  }

  async reindexWorkflowProcess(
    { id: workflow_id, number, userData, createdAt, createdBy, updatedAt, workflowTemplate, workflowStatusId, hasUnresolvedErrors, statuses },
    { processesLength, processIndex },
  ) {
    // Log every 1000th entry.
    if (parseInt(processIndex) % 1000 === 0) {
      log.save(
        'reindex-workflow-processes|processing-entry',
        {
          processing: parseInt(processIndex) + 1,
          processesLength,
          workflowId: workflow_id,
          workflowTemplateId: workflowTemplate?.id,
          createdAt,
          updatedAt,
        },
        'info',
      );
    }

    //prepare document for saving into elastic
    const document = {};

    document['@timestamp'] = new Date().toJSON();
    document['userData'] = userData;
    document['userworkflowTemplate'] = workflowTemplate;
    document['createdAt'] = createdAt;
    document['createdBy'] = createdBy;
    document['updatedAt'] = updatedAt;
    document['updatedBy'] = '';
    document['performerUsers'] = [];
    document['performerUserNames'] = [];
    document['signerUsers'] = [];
    document['signerUserNames'] = [];
    document['number'] = number;
    document['isWorkflowContainsErrors'] = false;
    document['hasUnresolvedErrors'] = hasUnresolvedErrors ? true : false;
    document['statuses'] = statuses;

    if (workflowStatusId) {
      document['workflowStatusId'] = workflowStatusId;
    }
    document['logs'] = [];

    const workflowLogs = await this.getByWorkflowId(workflow_id, {
      useSlaveDBInstance: true,
    });

    //additional processing
    workflowLogs.logs.forEach((workflowLog) => {
      //check if workflow contains errors
      if (workflowLog['type'] === 'error') {
        document['isWorkflowContainsErrors'] = true;
      } else if (workflowLog['type'] === 'task') {
        if (workflowLog.details.createdBy !== document['createdBy']) {
          if (workflowLog.details.createdBy !== 'system') {
            if (workflowLog.details.createdBy.length > USER_ID_LENGHT_LIMIT)
              log.save(this.name, 'createdBy field value for workflowLog entries was changed', 'warn');
            // document['createdBy'] = workflowLog.details.createdBy;
          }
        }

        if (workflowLog.details.updatedBy) {
          if (workflowLog.details.updatedBy !== document['updatedBy']) {
            if (workflowLog.details.updatedBy.length > USER_ID_LENGHT_LIMIT) {
              if (workflowLog.details.createdBy !== 'system') {
                document['updatedBy'] = workflowLog.details.updatedBy;
              }
            }
          }
        }

        if (workflowLog.details.performerUsers) {
          if (JSON.stringify(workflowLog.details.performerUsers) !== JSON.stringify(document['performerUsers'])) {
            let isPerformerUsersContainNotId = false;
            workflowLog.details.performerUsers.forEach((e) => {
              e.length < USER_ID_LENGHT_LIMIT ? (isPerformerUsersContainNotId = true) : false;
            });
            if (!isPerformerUsersContainNotId) {
              document['performerUsers'] = workflowLog.details.performerUsers;
              document['performerUserNames'] = workflowLog.details.performerUserNames;
            }
          }
        }

        if (workflowLog.details.signerUsers) {
          if (JSON.stringify(workflowLog.details.signerUsers) !== JSON.stringify(document['signerUsers'])) {
            let issignerUsersContainNotId = false;
            workflowLog.details.signerUsers.forEach((e) => {
              e.length < USER_ID_LENGHT_LIMIT ? (issignerUsersContainNotId = true) : false;
            });
            if (!issignerUsersContainNotId) {
              document['signerUsers'] = workflowLog.details.signerUsers;
              document['signerUserNames'] = workflowLog.details.signerUserNames;
            }
          }
        }
      }

      //save json as text
      workflowLog.details = JSON.stringify(workflowLog.details);
      document['logs'].push(workflowLog);
    });

    //saving to elastic

    const { protocol, index, hostname, port, token } = this.config?.elastic?.reindex || {};

    const baseUrl_ = `${protocol}://${hostname}:${port}`;
    const uri_ = `/${index}/_doc/${workflow_id}`;
    const headers_ = token ? { Authorization: `Basic ${token}` } : {};

    const url = baseUrl_ + uri_;
    const axiosConfig = {
      method: 'PUT',
      url,
      headers: headers_,
      data: document,
      timeout: PROCESS_TIMEOUT,
      validateStatus: () => true, // Always resolve, handle errors below
    };
    try {
      const response = await axios(axiosConfig);
      if (!(response.status >= 200 && response.status < 300)) {
        log.save(
          'error-during-saving-to-elastic',
          {
            error: response.statusText,
            status: response.status,
            requestOptions: { ...axiosConfig, data: '***', headers: '***' },
          },
          'error',
        );
      }
    } catch (error) {
      log.save(
        'error-during-saving-to-elastic',
        {
          error: error?.message,
          requestOptions: { ...axiosConfig, data: '***', headers: '***' },
        },
        'error',
      );
    }
  }
}

module.exports = WorkflowLogBusiness;
