const qs = require('qs');
const uuid = require('uuid-random');
const axios = require('axios');

const Filestorage = require('../../../lib/filestorage');
const TaskModel = require('../../../models/task');
const { prepareAxiosErrorToLog } = require('../../../lib/helpers');
const { SYSTEM_USER } = require('../../../constants/common');
const Sandbox = require('../../../lib/sandbox');
const typeOf = require('../../../lib/type_of');

/**
 * Event workflow.
 */
class EventWorkflow {
  constructor() {
    // Define singleton.
    if (!EventWorkflow.singleton) {
      this.taskModel = new TaskModel();
      this.sandbox = Sandbox.getInstance();
      EventWorkflow.singleton = this;
    }

    return EventWorkflow.singleton;
  }

  /**
   * Create workflows.
   * @param {{workflowParentId: string, createWorkflows: object[]}} data Data.
   */
  async createWorkflows({ workflowParentId, createWorkflows }) {
    const workflowIds = [];
    for (const createWorkflow of createWorkflows) {
      const workflowId = uuid();
      const {
        initData,
        fileIds = [],
        filesMeta = [],
        p7sFileIds = [],
        copyPdfByDocumentId,
        copyPdfWithoutSignaturesByDocumentId,
        copyAttachmentsByDocumentId,
        copyAttachmentsWithoutSignaturesByDocumentId,
        filterCopyAttachmentsByFileIds,
        copyAdditionalDataSignaturesByDocumentId,
      } = createWorkflow;

      let { files = [] } = createWorkflow;

      const filestorage = new Filestorage();

      // Get P7S files.
      for (const p7sFileId of p7sFileIds) {
        const p7sInfo = await filestorage.getFile(p7sFileId, true);
        const { name, contentType, fileContent } = p7sInfo;
        files.push({ name, contentType, fileContent });
      }

      // Get files.
      for (const fileIdIndex in fileIds) {
        const fileId = fileIds[fileIdIndex];
        const fileInfo = await filestorage.getFile(fileId);
        const fileMeta = filesMeta[fileIdIndex] || {};
        files.push({ ...fileInfo, meta: fileMeta });
      }

      global.messageQueue.produce({
        ...createWorkflow,
        initData: {
          ...initData,
          files,
          copyPdfByDocumentId,
          copyPdfWithoutSignaturesByDocumentId,
          copyAttachmentsByDocumentId,
          copyAttachmentsWithoutSignaturesByDocumentId,
          filterCopyAttachmentsByFileIds,
          copyAdditionalDataSignaturesByDocumentId,
        },
        workflowParentId: workflowParentId,
        forwardToTask: true,
        userId: SYSTEM_USER,
        createWorkflowId: workflowId,
      });

      workflowIds.push(workflowId);
    }

    return { workflowIds, status: true };
  }

  /**
   * Create workflows external.
   * Property `createWorkflowsExternal` sample: [{
   *   "workflowTemplateId": 10881,
   *   "taskTemplateId": 10881001,
   *   "initData": { ... },
   *   "externalSystem": "eVeteran",
   *   "fileIds": [...]
   * }]
   * @param {{createWorkflowsExternal: object[], jsonSchemaObject: object}} data Data.
   */
  async createWorkflowsExternal({ createWorkflowsExternal, jsonSchemaObject }) {
    // Define main params.
    const {
      workflowTemplateId: globalWorkflowTemplateId,
      taskTemplateId: globalTaskTemplateId,
      externalSystem: globalExternalSystem,
    } = jsonSchemaObject;

    // Handle.
    let responses = [];
    for (const createWorkflowExternal of createWorkflowsExternal) {
      // Check params according to `createWorkflowExternal.externalSystem`.
      const {
        workflowTemplateId = `${globalWorkflowTemplateId}`,
        taskTemplateId = `${globalTaskTemplateId}`,
        initData = createWorkflowExternal,
        externalSystem = globalExternalSystem,
        fileIds = [],
        filesMeta = [],
        p7sFileIds = [],
        attachmentsSignaturesIds = [],
        signaturesDocumentId,
      } = createWorkflowExternal;
      const externalSystemConfig = global.config.external_bpmn[externalSystem];

      const { url, urlPath = '/tasks/by-other-system', token, requestTimeout = 30000, queryParams, requestHeaders } = externalSystemConfig || {};

      if (!url || !token) {
        log.save('create-workflow-external-error|external-system-params-not-defined', {
          createWorkflowExternal,
          externalSystemConfig,
        });
        let error = new Error('External system params not defined in config file. Check external system name in JSON schema.');
        error.details = {
          jsonSchemaExternalSystem: externalSystem,
          availableExternalSystems: Object.keys(global.config.external_bpmn),
        };
        throw error;
      }

      // Files container.
      const filestorage = new Filestorage();
      let files = createWorkflowExternal.files || [];

      // Get P7S files.
      for (const p7sFileId of p7sFileIds) {
        const p7sInfo = await filestorage.getFile(p7sFileId, true);
        const { name, contentType, fileContent } = p7sInfo;
        files.push({ name, contentType, fileContent });
      }

      // Get files.
      for (const fileIdIndex in fileIds) {
        const fileId = fileIds[fileIdIndex];
        const fileInfo = await filestorage.getFile(fileId);
        const fileMeta = filesMeta[fileIdIndex] || {};
        files.push({ ...fileInfo, meta: fileMeta });
      }

      // Get attachmentsSignatures.
      let attachmentsSignatures = [];
      for (const attachmentsSignaturesId of attachmentsSignaturesIds) {
        const fileInfo = await filestorage.getFile(attachmentsSignaturesId);
        const p7sInfo = await filestorage.getFile(attachmentsSignaturesId, true);
        attachmentsSignatures.push({ ...fileInfo, p7sSignature: p7sInfo.fileContent });
      }

      // Get document signatures.
      let signatures;
      if (signaturesDocumentId) {
        const documentSignatures = await global.models.documentSignature.findByDocumentId(signaturesDocumentId);
        if (!Array.isArray(documentSignatures) || documentSignatures.length === 0) {
          throw new Error('Document signatures not found.');
        }
        signatures = documentSignatures.map(({ signature }) => JSON.parse(signature)[0]);
      }

      // Do requests to create system tasks.
      const requestOptions = {
        url: `${url}${urlPath}?${qs.stringify(queryParams)}`,
        method: 'POST',
        headers: { Authorization: token, ...requestHeaders },
        data: {
          workflowTemplateId,
          taskTemplateId,
          initData: { ...initData, files, signatures, attachmentsSignatures },
        },
        timeout: requestTimeout,
      };
      let response;
      try {
        response = (await axios(requestOptions)).data;
      } catch (error) {
        log.save(
          'create-workflow-external-error|request-error',
          {
            requestOptions,
            response,
            ...prepareAxiosErrorToLog(error),
          },
          'error',
        );
        const outError = Error('External system request error.');
        outError.details = {
          message: error && error.message,
          requestOptions: { ...requestOptions, headers: undefined },
        };
        throw outError;
      }
      responses.push(response);
    }

    // Return response.
    return responses;
  }

  /**
   * Create workflows external.
   * Property `sendStatusExternal` sample: {
   *   "externalSystem": "system",
   *   "workflowId": "2a4badc0-8d8d-11eb-8010-8d686fafd92c",
   *   "taskTemplateId": "31459002",
   *   "data": { ... }
   * }
   * @param {{sendStatusExternal: object, jsonSchemaObject: object}} data Data.
   */
  async sendStatusExternal({ sendStatusExternal, jsonSchemaObject }) {
    // Define main params.
    const { taskTemplateId: globalTaskTemplateId, externalSystem: globalExternalSystem } = jsonSchemaObject;

    // Check params according to `sendStatusExternal.externalSystem`.
    const {
      workflowId,
      taskTemplateId = globalTaskTemplateId,
      data,
      externalSystem = globalExternalSystem,
      fileIds = [],
      filesMeta = [],
      p7sFileIds = [],
      attachmentsSignaturesIds = [],
    } = sendStatusExternal;
    const externalSystemConfig = global.config.external_bpmn[externalSystem];

    const {
      url,
      urlPath = `/external_services/workflow/${workflowId}/task_template/${taskTemplateId}`,
      token,
      requestTimeout = 30000,
      queryParams,
      requestHeaders,
    } = externalSystemConfig || {};

    if (!url || !token) {
      log.save('send-status-external-error|external-system-params-not-defined', {
        sendStatusExternal,
        externalSystemConfig,
      });
      throw new Error('External system params not defined.');
    }

    // Files container.
    const filestorage = new Filestorage();
    let files = sendStatusExternal.files || [];

    // Get P7S files.
    for (const p7sFileId of p7sFileIds) {
      const p7sInfo = await filestorage.getFile(p7sFileId, true);
      const { name, contentType, fileContent } = p7sInfo;
      files.push({ name, contentType, fileContent });
    }

    // Get files.
    for (const fileIdIndex in fileIds) {
      const fileId = fileIds[fileIdIndex];
      const fileInfo = await filestorage.getFile(fileId);
      const fileMeta = filesMeta[fileIdIndex] || {};
      files.push({ ...fileInfo, meta: fileMeta });
    }

    // Get attachmentsSignatures.
    let attachmentsSignatures = [];
    for (const attachmentsSignaturesId of attachmentsSignaturesIds) {
      const fileInfo = await filestorage.getFile(attachmentsSignaturesId);
      const p7sInfo = await filestorage.getFile(attachmentsSignaturesId, true);
      attachmentsSignatures.push({ ...fileInfo, p7sSignature: p7sInfo.fileContent });
    }

    // Do requests to send status.
    const requestOptions = {
      url: `${url}${urlPath}?${qs.stringify(queryParams)}`,
      method: 'POST',
      headers: { Authorization: token, ...requestHeaders },
      data: { document: data, files, attachmentsSignatures },
      timeout: requestTimeout,
    };
    let response;
    try {
      response = (await axios(requestOptions)).data;
    } catch (error) {
      log.save(
        'send-status-external-error|request-error',
        {
          requestOptions,
          response,
          ...prepareAxiosErrorToLog(error),
        },
        'error',
      );
      const outError = new Error('External system request error.');
      outError.details = {
        message: error && error.message,
        requestOptions: { ...requestOptions, headers: undefined },
      };
      throw outError;
    }

    // Return response.
    return response;
  }

  /**
   * Send status.
   * @param {{sendStatus: object|object[]}} data Data.
   */
  async sendStatus({ sendStatus }) {
    if (!Array.isArray(sendStatus)) {
      return await sendStatusToOneWorkflow.call(this, sendStatus);
    }

    const sendStatusesResult = [];
    for (let sendStatusItem of sendStatus) {
      sendStatusesResult.push(await sendStatusToOneWorkflow.call(this, sendStatusItem));
    }
    return sendStatusesResult;

    async function sendStatusToOneWorkflow(sendStatusData) {
      try {
        const { workflowId, taskTemplateId, data } = sendStatusData;

        const workflow = await global.models.workflow.findById(workflowId);
        if (!workflow) {
          throw new Error('Workflow not found.');
        }

        const task = await global.models.task.findByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId);
        if (!task) {
          throw new Error('Task not found.');
        }
        if (task.isSystem === false) {
          throw new Error('The task is not the system.');
        }
        if (task.finished === true) {
          throw new Error('The task has already been committed.');
        }

        const document = await global.models.document.findById(task.documentId);
        if (!document) {
          throw new Error('Document not found.');
        }
        if (document.isFinal === true) {
          throw new Error('The document has already been committed.');
        }

        const savedDocument = await global.models.document.updateData(document.id, data);
        if (!savedDocument) {
          throw new Error('The document cannot be saved.');
        }
        await global.models.document.setStatusFinal(document.id);

        const savedTask = await global.models.task.setStatusFinished(task.id);
        if (!savedTask) {
          throw new Error('The task cannot be saved.');
        }

        try {
          const workflowTemplate = await global.models.workflowTemplate.findByIdCached(workflow.workflowTemplateId);
          const documents = await global.models.task.getDocumentsByWorkflowId(workflowId, true);
          const events = await global.models.event.getEventsByWorkflowId(workflowId);

          await this.setWorkflowStatus(workflowId, workflowTemplate, parseInt(task.taskTemplateId), {
            documents,
            events,
          });
        } catch (error) {
          log.save('set-workflow-status-error', { workflowId, error: error.message });
          await models.workflowError.create(
            {
              error: 'Can not set the workflow status.',
              details: {
                message: error.message,
              },
              traceMeta: {
                workflowId,
                taskId: task.id,
                taskTemplateId: task.taskTemplateId,
              },
              queueMessage: {},
            },
            'warning',
          );
        }

        global.messageQueue.produce({ workflowId: workflowId, taskId: task.id });

        const response = {
          ...savedTask,
          document: savedDocument,
        };

        return response;
      } catch (error) {
        log.save('workflow-send-status-error', {
          ...sendStatus,
        });
        throw error;
      }
    }
  }

  /**
   * Set workflow status.
   * @private
   * @param {string} workflowId Workflow ID.
   * @param {object} workflowTemplateId Workflow template.
   * @param {number} taskTemplateId Task template ID.
   */
  async setWorkflowStatus(workflowId, workflowTemplate, taskTemplateId, { documents, events }) {
    if (!Array.isArray(workflowTemplate.data.statuses)) {
      return;
    }

    const status = workflowTemplate.data.statuses.find((v) => v.taskTemplateId && v.taskTemplateId === taskTemplateId);
    if (!status || (!status.statusId && !status.calculate)) {
      return;
    }

    if (status.calculate) {
      const frontUrl = global.config.notifier?.email?.templateParams?.frontUrl;
      if (typeOf(frontUrl) === 'string') {
        status.calculate = status.calculate.replaceAll('{{frontUrl}}', frontUrl);
      }

      const calculatedStatus = this.sandbox.evalWithArgs(
        status.calculate,
        [documents, events],
        { meta: { fn: 'calculate', caller: 'EventWorkflow.setWorkflowStatus' } },
      );
      if (!Array.isArray(calculatedStatus) || calculatedStatus.length === 0) {
        return;
      }

      if (
        !calculatedStatus.every((v) => {
          if (
            typeof v.type === 'string' &&
            ['doing', 'done', 'rejected'].includes(v.type.toLowerCase()) &&
            typeof v.label === 'string' &&
            typeof v.description === 'string'
          ) {
            return true;
          }
          return false;
        })
      ) {
        log.save('set-workflow-status|status-calculate-error', { workflowId, status });
        throw new Error('Invalid status.');
      }

      const nonTabedStatuses = calculatedStatus.filter((s) => s.isStatusesTab === false);
      const nonTabedStatusesLength = nonTabedStatuses.length;

      if (nonTabedStatusesLength === 0) {
        log.save('set-workflow-status|statusId-calculate-error|non-tabed-statuses-dont-exist', { workflowId, calculatedStatus });
        throw new Error('Invalid status. Non tabed statuses don\'t exist.');
      }

      let statusId;
      if (nonTabedStatuses[nonTabedStatusesLength - 1].type.toLowerCase() === 'doing') {
        statusId = 1;
      } else if (nonTabedStatuses[nonTabedStatusesLength - 1].type.toLowerCase() === 'done') {
        statusId = 2;
      } else if (nonTabedStatuses[nonTabedStatusesLength - 1].type.toLowerCase() === 'rejected') {
        statusId = 3;
      }
      await models.workflow.setStatus(workflowId, statusId, calculatedStatus);
      log.save('set-workflow-status|status-defined', {
        workflowId,
        statusId,
        calculatedStatus,
        workflowTemplateId: workflowTemplate.id,
      });
    } else if (status.statusId) {
      await models.workflow.setStatus(workflowId, status.statusId);
      log.save('set-workflow-status|status-defined', { workflowId, statusId: status.statusId, workflowTemplateId: workflowTemplate.id });
    }
  }

  /**
   * Set new tasks performers.
   * @param {object} options Options.
   * @param {number[]} options.taskIds Task IDs.
   * @param {string[]} options.newPerformerUsers IDs of new performer users.
   * @param {string[]} options.fromPerformerUsers IDs of "old" performer user.
   * @param {number[]} options.jsonSchemaObject.allowedTaskTemplateIds IDs of allowed task task template IDs.
   * @returns {Promise<object[]>} Array of tasks in "short" view: id, workflowId, taskTemplateId, performerUsers, createdAt, updatedAt, meta.
   */
  async setNewTasksPerformers({
    taskIds,
    newPerformerUsers,
    newPerformerUserNames,
    fromPerformerUsers,
    jsonSchemaObject: { allowedTaskTemplateIds },
  }) {
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Param taskIds is required and must be not empty array.');
    }
    if (!newPerformerUsers || !Array.isArray(newPerformerUsers) || newPerformerUsers.length === 0) {
      throw new Error('Param newPerformerUsers is required and must be not empty array.');
    }
    if (!newPerformerUserNames || !Array.isArray(newPerformerUserNames) || newPerformerUserNames.length === 0) {
      throw new Error('Param newPerformerUserNames is required and must be not empty array.');
    }
    if (!fromPerformerUsers || !Array.isArray(fromPerformerUsers) || fromPerformerUsers.length === 0) {
      throw new Error('Param fromPerformerUsers is required and must be not empty array.');
    }
    if (!allowedTaskTemplateIds || !Array.isArray(allowedTaskTemplateIds) || allowedTaskTemplateIds.length === 0) {
      throw new Error('Param allowedTaskTemplateIds is required and must be not empty array.');
    }

    const tasks = await Promise.all(taskIds.map((taskId) => this.taskModel.findById(taskId)));

    if (!tasks.every((task) => task.performerUsers.some((userId) => fromPerformerUsers.includes(userId)))) {
      throw new Error('Task performer must be in passed fromPerformerUsers.');
    }

    if (!tasks.every((task) => allowedTaskTemplateIds.includes(task.taskTemplateId))) {
      throw new Error('Passed taskIds must have allowed taskTemplateId, passed in allowedTaskTemplateIds param.');
    }

    if (!tasks.every((task) => !task.finished && !task.deleted)) {
      throw new Error('Tasks must be not finished and not deleted.');
    }

    const result = [];
    for (let taskId of taskIds) {
      const updatedTask = await this.taskModel.setPerformerUsers(taskId, newPerformerUsers, newPerformerUserNames);
      const { id, workflowId, taskTemplateId, performerUsers, performerUserNames, createdAt, updatedAt, meta } = updatedTask;
      result.push({ id, workflowId, taskTemplateId, performerUsers, performerUserNames, createdAt, updatedAt, meta });
    }

    return result;
  }
}

module.exports = EventWorkflow;
