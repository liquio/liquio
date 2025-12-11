const _ = require('lodash');
const axios = require('axios');

const Exceptions = require('../exceptions');
const TaskService = require('../services/task');
const AuthService = require('../services/auth');
const FileStorageService = require('../services/filestorage');
const Stream = require('../lib/stream');
const Db = require('../lib/db');

const ELASTIC_KEYS = [
  'name',
  'user_data',
  'workflow_template_id',
  'workflow_status_id',
  'is_draft',
  'is_not_draft',
  'type',
  'from_created_at',
  'to_created_at',
  'from_updated_at',
  'to_updated_at',
  'has_errors',
  'has_unresolved_errors',
  'statuses',
];

const DB_ONLY_KEYS = ['task_template_id', 'event_template_id', 'gateway_template_id'];

const WORKFLOWLIST_RESPONSE_FIELDS = [
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
  'number',
  'userData',
  'isWorkflowContainsErrors',
  'hasUnresolvedErrors',
  'workflowStatusId',
  'workflowStatus',
  'statuses',
];

const BRIEF_WORKFLOWLIST_RESPONSE_FIELDS = ['id', 'workflow_template_id', 'has_unresolved_errors'];

const BRIEF_INFO_LIMIT = 10000;

/**
 * Workflow process business.
 */
class WorkflowProcessBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowProcessBusiness.singleton) {
      this.config = config;
      this.taskService = new TaskService();
      this.authService = new AuthService(config.auth);
      this.fileStorageService = new FileStorageService();
      WorkflowProcessBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowProcessBusiness.singleton;
  }

  /**
   * Get workflow processes.
   * @returns {Promise<WorkflowEntity[]>}
   */
  async getAll(params) {
    let meta = {};

    params.extended = true;

    if (params.filters['workflow_status_id'] === 'is_draft') {
      params.filters.is_draft = true;
      delete params.filters.workflow_status_id;
    }

    if (params.filters['workflow_status_id'] === 'is_not_draft') {
      params.filters.is_not_draft = true;
      delete params.filters.workflow_status_id;
    }

    // If date filters are YYYY-MM-DD format strings, convert to YYYY-MM-DDTHH:mm:ss.sssZ to match day exactly.
    let { from_created_at, to_created_at, from_updated_at, to_updated_at } = params.filters;
    if (typeof from_created_at === 'string' && from_created_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
      params.filters.from_created_at = `${from_created_at}T00:00:00.000${Db.tz}`;
    }
    if (typeof to_created_at === 'string' && to_created_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
      params.filters.to_created_at = `${to_created_at}T23:59:59.999${Db.tz}`;
    }
    if (typeof from_updated_at === 'string' && from_updated_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
      params.filters.from_updated_at = `${from_updated_at}T00:00:00.000${Db.tz}`;
    }
    if (typeof to_updated_at === 'string' && to_updated_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
      params.filters.to_updated_at = `${to_updated_at}T23:59:59.999${Db.tz}`;
    }

    if (params.briefInfo) {
      params.page = 1;
      params.extended = false;
      params.disableElastic = true;
      params.count = BRIEF_INFO_LIMIT;
      params.attributes = BRIEF_WORKFLOWLIST_RESPONSE_FIELDS;
    }

    // Use Elastic.
    if (
      config.elastic?.enabled &&
      !params?.disableElastic &&
      Object.keys(params.filters).some((filterName) => ELASTIC_KEYS.includes(filterName)) &&
      !Object.keys(params.filters).some((filterName) => DB_ONLY_KEYS.includes(filterName))
    ) {
      try {
        return this.prepareWorkflows(await this.getAllElasticFiltered(params));
      } catch (error) {
        meta.errorMessage = 'Workflow logs Elastic error.';
        meta.allowedFilters = [
          'id',
          'workflow_template_id',
          'task_template_id',
          'event_template_id',
          'gateway_template_id',
          'is_final',
          'created_by',
          'workflow_status_id',
          'workflow_status',
          'has_errors',
          'has_unresolved_errors',
          'number',
          'is_draft',
          'is_not_draft',
        ];
        meta.rawError = error?.message;
      }
    }

    meta.source = 'db';

    const { page: currentPage, count: perPage } = params;

    const modelsInstance = params?.useSlaveDBInstance && global.slaveModels ? global.slaveModels : models;

    let workflowProcesses = await modelsInstance.workflow.getAll({
      ...params,
      currentPage,
      perPage,
    });

    if (params.briefInfo) {
      workflowProcesses.pagination.total = workflowProcesses.data.length;
    } else {
      workflowProcesses = await this.prepareWorkflows(workflowProcesses);
    }

    return { ...workflowProcesses, meta };
  }

  /**
   * Get workflow processes.
   * @returns {Promise<WorkflowEntity[]>}
   */
  async getAllByWorkflowIds(workflowIds) {
    const modelsInstance = global.slaveModels ? global.slaveModels : models;
    return await modelsInstance.workflow.getAllByWorkflowIds(workflowIds);
  }

  /**
   * @param params
   * @return {Promise<*>}
   */
  async getAllElasticFiltered({ page: currentPage, count: perPage, _sort, _filters } = {}) {
    // ...existing code...
    const elasticUrl = this.config.elastic.protocol + '://' + this.config.elastic.host + this.config.elastic.uri;
    const axiosConfig = {
      method: this.config.elastic.method,
      url: elasticUrl,
      headers: this.config.elastic.headers,
      data: {},
      timeout: this.config.elastic.timeout || 30000,
      validateStatus: () => true, // Always resolve, handle errors below
    };
    log.save('elastic-search-request', { request: axiosConfig });
    let data;
    try {
      const response = await axios(axiosConfig);
      if (response.status >= 200 && response.status < 300) {
        data = response.data;
      } else {
        log.save('elactic-search-error', { error: response.statusText, status: response.status, request: axiosConfig });
        data = undefined;
      }
    } catch (error) {
      log.save('elactic-search-error', { error: error?.message, request: axiosConfig });
      data = undefined;
    }
    log.save('elastic-search-response', { request: axiosConfig, response: {} });

    let { hits: { total: { value: total } = {}, hits = [] } = {} } = data || {};

    let parsedResponse = hits.map((element) => {
      const resultElement = _.pick(element._source, WORKFLOWLIST_RESPONSE_FIELDS);

      const messages = element._source.logs
        .filter((logElement) => {
          return ['workflow_incoming_message', 'workflow_outgoing_message'].includes(logElement.type);
        })
        .map((message) => {
          const details = JSON.parse(message.details);
          let type;

          switch (message.type) {
            case 'workflow_incoming_message':
              type = 'in';
              break;
            case 'workflow_outcoming_message':
              type = 'out';
              break;
          }

          return {
            type,
            createdAt: message.createdAt,
            ...details,
          };
        });

      return {
        id: element._id,
        workflowTemplateId: element._source.userworkflowTemplate.id,
        workflowTemplate: element._source.userworkflowTemplate,
        data: {
          messages: messages.length ? messages : undefined,
        },
        ...resultElement,
      };
    });

    return {
      data: parsedResponse,
      pagination: {
        total,
        currentPage,
        perPage,
        lastPage: Math.max(Math.ceil(total / perPage), 1),
      },
    };
  }

  /**
   * Find workflow template by ID.
   * @param {number} id Workflow template ID.
   * @returns {Promise<WorkflowEntity>}
   */
  async findById(id) {
    let workflow = await models.workflow.findById(id);

    if (!workflow) {
      return;
    }

    const { name = null, description = null } = this.getLastStepLabel(workflow);
    workflow.lastStepLabel = name;
    workflow.lastStepDescription = description;
    const signatureRemovalHistory = await this.getSignatureRemovalHistoryByWorkflowId(id);
    workflow.signatureRemovalHistory = signatureRemovalHistory || [];
    return workflow;
  }

  /**
   * Update.
   * @param {number} id Workflow template ID.
   * @param {object} data Data.
   */
  async update(id, data) {
    const workflow = await models.workflow.findById(id);

    if (!workflow) {
      return;
    }

    await models.workflow.update(workflow.id, {
      hasUnresolvedErrors: data.hasUnresolvedErrors,
    });
  }

  /**
   * Get tasks.
   * @returns {Promise<object[]>}
   */
  async getTasks(params) {
    if (params.filters['user_ids']) {
      const units = await models.unit.getAll({
        filters: { heads: params.filters['user_ids'], members: params.filters['user_ids'] },
      });
      const userUnitIds = units.map((v) => v.id);
      params.filters['user_unit_ids'] = userUnitIds;
    }

    if (params.filters['user_id_list']) {
      params.filters['user_id_list'] = Array.isArray(params.filters['user_id_list'])
        ? params.filters['user_id_list']
        : [params.filters['user_id_list']];
    }

    let tasks = await models.task.getAll(params);

    // Prepare usernames.
    if (tasks && tasks.data) {
      let foundUsersFromAuthService = [];
      for (const task of tasks.data) {
        foundUsersFromAuthService = await this.authService.getUsersByIdsWithCache(
          [task.createdBy].concat(task.performerUsers, task.signerUsers),
          foundUsersFromAuthService,
        );

        const createdByUser = foundUsersFromAuthService.find((v) => v.userId === task.createdBy);
        if (createdByUser) {
          task.createdByInfo = this.authService.prepareUserInfoFromId(createdByUser);
        }

        let performerUsers = [];
        for (const userId of task.performerUsers) {
          const performerUser = foundUsersFromAuthService.find((v) => v.userId === userId);
          if (performerUser) {
            performerUsers.push(this.authService.prepareUserInfoFromId(performerUser));
          } else {
            performerUsers.push({
              userId: userId,
            });
          }
        }
        task.performerUsersInfo = performerUsers;

        let signerUsers = [];
        for (const userId of task.signerUsers) {
          const signerUser = foundUsersFromAuthService.find((v) => v.userId === userId);
          if (signerUser) {
            signerUsers.push(this.authService.prepareUserInfoFromId(signerUser));
          } else {
            signerUsers.push({
              userId: userId,
            });
          }
        }

        task.signerUsersInfo = signerUsers;
      }
    }

    return tasks;
  }

  /**
   * Update task.
   * @param {number} id Workflow template ID.
   * @param {object} data Data.
   */
  async updateTask(id, data) {
    const task = await models.task.findById(id);

    if (!task) {
      return;
    }

    await models.task.update(task.id, { finished: data.finished });
    await models.document.update(task.documentId, {
      isFinal: data.document.isFinal,
      data: data.document.data,
    });
  }

  /**
   * Cancel event.
   * @param {string} workflowId Workflow ID.
   * @param {string} eventId Event ID.
   * @returns {Promise<void>}
   */
  async cancelEvent(workflowId, eventId) {
    const event = await models.event.findById(eventId);

    if (!event || event.workflowId !== workflowId) {
      throw new Error('Event not found.');
    }

    if (event?.workflow?.isFinal) {
      throw new Error('Workflow already finished.');
    }

    if (event.done) {
      throw new Error('Event already done.');
    }

    await models.event.setCancelled(eventId);
  }

  /**
   * Prepare workflows.
   * @private
   * @param {WorkflowEntity[]} workflows Workflow entities.
   * @returns {WorkflowEntity[]}
   */
  async prepareWorkflows(workflows) {
    for (let workflow of workflows.data) {
      if (workflow.workflowErrors) {
        if (workflow.workflowErrors.length > 0) {
          workflow.isWorkflowContainsErrors = true;
        } else {
          workflow.isWorkflowContainsErrors = false;
        }
      }

      const { name = null, description = null } = this.getLastStepLabel(workflow);
      workflow.lastStepLabel = name;
      workflow.lastStepDescription = description;
      workflow.isDraft = workflow.data?.messages ? false : true;
      workflow.workflowStatusId = workflow.workflowStatusId || null;
    }

    return workflows;
  }

  /**
   * Get last step label.
   * @private
   * @param {WorkflowEntity} workflow Workflow entity.
   * @returns {object}
   */
  getLastStepLabel(workflow) {
    const { steps = [], messages = [] } = this.getTimelineStepsAndMessages(workflow) || {};
    if (!steps.length || !steps.length) {
      return { name: null, description: null };
    }

    let labels = [];

    for (const message of messages) {
      const firstSequence = _.head(message.sequences);

      if (typeof firstSequence === 'undefined' || typeof firstSequence.sourceRef === 'undefined') {
        continue;
      }
      if (/task-/.test(firstSequence.sourceRef)) {
        const taskTemplateId = parseInt(firstSequence.sourceRef.replace(/task-/, ''));
        const step = steps.find((v) => v.taskTemplateId === taskTemplateId);

        if (step && step.label) {
          labels.push({ name: step.label, description: step.description });
        }
      } else if (/event-/.test(firstSequence.sourceRef)) {
        const eventTemplateId = parseInt(firstSequence.sourceRef.replace(/event-/, ''));
        const step = steps.find((v) => v.eventTemplateId === eventTemplateId);

        if (step && step.label) {
          labels.push({ name: step.label, description: step.description });
        }
      }
    }

    if (labels.length === 0) {
      return { name: null, description: null };
    }

    return _.last(labels);
  }

  /**
   * Get timeline steps and messages.
   * @private
   * @param {WorkflowEntity} workflow Workflow entity.
   * @return {{messages: object[], steps: object[]}}
   */
  getTimelineStepsAndMessages(workflow) {
    const workflowMessages = _.get(workflow, 'data.messages', []);
    const steps = _.get(workflow.workflowTemplate, 'data.timeline.steps', []);

    if (!workflowMessages.length || !steps.length) {
      return;
    }

    const messages = workflowMessages.filter(
      (v) => v.type && v.type === 'in' && v.sequences && v.sequences.every((sequence) => /^(task|event)-[0-9]+$/.test(sequence.sourceRef)),
    );

    return { messages, steps };
  }

  /**
   * Download file request options.
   * @param {string} id File ID.
   */
  async downloadFileRequestOptions(id) {
    return await this.fileStorageService.downloadFileRequestOptions(id);
  }

  /**
   * Download p7s request options.
   * @param {string} id ID.
   * @param {boolean} [asFile] Get as file indicator.
   * @param {boolean} [asBase64] Get as Base64 indicator.
   * @returns {Promise<object>}
   */
  async downloadP7sRequestOptions(id, asFile, asBase64) {
    return await this.fileStorageService.downloadP7sRequestOptions(id, asFile, asBase64);
  }

  /**
   * Download p7s.
   * @param {string} id ID.
   * @param {boolean} [asFile] Get as file indicator.
   * @param {boolean} [asBase64] Get as Base64 indicator.
   * @returns {Promise<ReadableData>}
   */
  async downloadP7s(id, asFile, asBase64) {
    return await this.fileStorageService.downloadP7s(id, asFile, asBase64);
  }

  /**
   * Set status and get wotkflow ID.
   * @param {{taskId, status, statusTaskTemplateId}} options Status options.
   */
  async setStatusAndGetWorkflowId({ taskId, status, statusTaskTemplateId }) {
    // Get workflow info.
    const task = await models.task.findById(taskId);
    const { workflowId } = task;
    const { data: tasks } = await models.task.getAll({
      filters: {
        workflow_id: workflowId,
      },
      sort: {
        created_at: 'desc',
      },
    });
    const statusTask = tasks.find((v) => v.taskTemplateId === statusTaskTemplateId && v.finished === false);
    const { id: statusTaskId } = statusTask;

    // Set status and finish task.
    await this.updateTask(statusTaskId, {
      document: {
        data: { status: { paymentStatus: status } },
        isFinal: true,
      },
      finished: true,
    });

    // Return workflow ID.
    return workflowId;
  }

  /**
   * Clear the process that has been called more than twice from the same events and gateways.
   * @param {string} workflowId Workflow ID.
   */
  async clearProcess(workflowId) {
    const workflow = await models.workflow.findById(workflowId);

    if (!workflow) {
      throw new Exceptions.NOT_FOUND();
    }

    if (!workflow?.data?.messages || workflow.data.messages.length === 0) {
      return;
    }

    const { filteredMessages, count } = this.deleteDuplicateMessages(workflow.data.messages);
    workflow.data.messages = filteredMessages;

    for (const [key, value] of Object.entries(count.in)) {
      if (value.count > 2) {
        if (key.includes('event')) {
          await models.event.deleteEvents(workflow.id, value.templateId);
        } else if (key.includes('gateway')) {
          await models.gateway.deleteGateway(workflow.id, value.templateId);
        }

        log.save('clear-process-delete', { key, value });
      }
    }

    log.save('clear-process', { workflowId, filteredMessages });
    await models.workflow.updateData(workflow.id, workflow.data);
  }

  /**
   * Delete duplicate messages.
   * @private
   * @param {object[]} messages Messages.
   * @returns {{filteredMessages: object[], count: object}}
   */
  deleteDuplicateMessages(messages) {
    const count = messages.reduce((acc, item) => {
      if (item.type === 'in' || item.type === 'out') {
        const type = item.type;
        if (item.sequences[0]?.sourceRef.includes('gateway') || item.sequences[0]?.sourceRef.includes('event')) {
          if (!acc[type]) {
            acc[type] = {};
          }

          if (!acc[type][item.sequences[0]?.sourceRef]) {
            acc[type][item.sequences[0]?.sourceRef] = {
              templateId: parseInt(item.sequences[0]?.sourceRef.split('-')[1]),
              count: 0,
            };
          }

          acc[type][item.sequences[0]?.sourceRef]['count'] = acc[type][item.sequences[0]?.sourceRef]['count'] + 1;
        }
      }

      return acc;
    }, {});

    const filteredMessages = messages.filter((item) => {
      if (item.type === 'in' || item.type === 'out') {
        const type = item.type;
        if (item.sequences[0]?.sourceRef.includes('gateway') || item.sequences[0]?.sourceRef.includes('event')) {
          if (typeof count[type][item.sequences[0]?.sourceRef]['removed'] === 'undefined') {
            count[type][item.sequences[0]?.sourceRef]['removed'] = 0;
            count[type][item.sequences[0]?.sourceRef]['isSkippedFirst'] = false;
          }

          if (count[type][item.sequences[0]?.sourceRef]['isSkippedFirst'] === false) {
            count[type][item.sequences[0]?.sourceRef]['isSkippedFirst'] = true;

            return true;
          }

          if (
            count[type][item.sequences[0]?.sourceRef]['count'] > 2 &&
            count[type][item.sequences[0]?.sourceRef]['removed'] + 3 < count[type][item.sequences[0]?.sourceRef]['count']
          ) {
            count[type][item.sequences[0]?.sourceRef]['removed'] = count[type][item.sequences[0]?.sourceRef]['removed'] + 1;

            return false;
          }
        }
      }

      return true;
    });

    log.save('delete-duplicate-messages', { count });

    return { filteredMessages, count };
  }

  /**
   * Delete all signatures from document (documentSignature, p7s, additionalDataSignature).
   * @public
   * @param {object} options Options.
   * @param {object} options.workflowId Workflow ID.
   * @param {object} options.documentId Document ID.
   * @param {object} options.initiator User - initiator ({userName, userId}).
   * @returns {{Promise<Object>}}
   */
  async deleteAllSignaturesFromDocument({ workflowId, documentId, initiator }) {
    const task = await models.task.findByDocumentId(documentId);
    const document = await models.document.findById(documentId);

    if (task.workflowId !== workflowId) {
      log.save('delete-signatures-error-wrong-workflow-id', { passedWorkflowId: workflowId, documentId });
      throw new Error('Passed wrong workflowId.');
    }

    if (task.finished) {
      log.save('delete-signatures-error-task-finished', { documentId });
      throw new Error('Task is already finished.');
    }

    if (document.isFinal) {
      log.save('delete-signatures-error-document-final', { documentId });
      throw new Error('Document is already final.');
    }

    if (task.deleted) {
      log.save('delete-signatures-error-task-deleted', { documentId });
      throw new Error('Task is deleted.');
    }
    const user = {
      userId: initiator.userId,
      userName: `${initiator.lastName} ${initiator.firstName} ${initiator.middleName || ''}`.trim(),
    };
    const historyModelResponses = [];

    // Deleting documentSignature.
    const existingDocumentSignatures = await models.documentSignature.getByDocumentId(documentId);
    if (existingDocumentSignatures.length === 0) {
      log.save('delete-signatures-error-no-signatures-by-documentId', { documentId });
      throw new Error('Signatures by documentId doesn\'t exist.');
    }
    await models.documentSignature.deleteByDocumentId(documentId);
    const promisesSavingDeletedDocumentSignature = existingDocumentSignatures.map((signature) =>
      models.signatureRemovalHistory.create(
        {
          id: signature.id,
          createdBy: signature.createdBy,
          createdAt: signature.createdAt,
          updatedAt: signature.updatedAt,
          type: 'documentSignature',
        },
        documentId,
        workflowId,
        user,
      ),
    );
    historyModelResponses.push(...(await Promise.all(promisesSavingDeletedDocumentSignature)));

    // Deleting p7s of pdf file and attachments.
    const documentAttachmentLinks = ((await models.documentAttachment.getByDocumentId(documentId)) || []).map(({ link }) => link);
    const fileIdsForP7sSearch = [document.fileId, ...documentAttachmentLinks];
    const existingP7sSignatures = [];
    for (const fileId of fileIdsForP7sSearch) {
      const downloadP7sResponse = await this.downloadP7s(fileId, false, false);
      const responseContent = await Stream.getFileContent(downloadP7sResponse.readableStream);
      existingP7sSignatures.push(JSON.parse(responseContent.toString('base64')).data);
    }
    await Promise.all(existingP7sSignatures.map(({ id }) => this.deleteP7s(id)));

    const promisesSavingDeletedP7s = existingP7sSignatures.map((signature) =>
      models.signatureRemovalHistory.create(
        {
          id: signature.id,
          p7s: signature.p7s,
          createdAt: signature.createdAt,
          updatedAt: signature.updatedAt,
          fileName: signature.fileName,
          type: 'p7s',
        },
        documentId,
        workflowId,
        user,
      ),
    );
    historyModelResponses.push(...(await Promise.all(promisesSavingDeletedP7s)));

    // Deleting additionalDataSignature.
    const existingAdditionalDataSignature = await models.additionalDataSignature.getByDocumentId(documentId);
    await models.additionalDataSignature.deleteByDocumentId(documentId);
    const promisesSavingDeletedAdditionalDataSignature = existingAdditionalDataSignature.map((signature) =>
      models.signatureRemovalHistory.create(
        {
          id: signature.id,
          createdBy: signature.createdBy,
          createdAt: signature.createdAt,
          updatedAt: signature.updatedAt,
          type: 'additionalDataSignature',
        },
        documentId,
        workflowId,
        user,
      ),
    );
    historyModelResponses.push(...(await Promise.all(promisesSavingDeletedAdditionalDataSignature)));

    // Return short result - without p7s content, file names etc.s
    const result = {
      user,
      historyModelResponse: historyModelResponses.map((el) => ({
        id: el.id,
        documentId: el.documentId,
        workflowId: el.workflowId,
        createdAt: el.createdAt,
        signatureCreatedAt: el.signatureCreatedAt,
        signatureUpdatedAt: el.signatureUpdatedAt,
        signatureType: el.signatureType,
      })),
    };
    return result;
  }

  /**
   * Get signature removal history by workflow ID.
   * @private
   * @param {object} workflowId Workflow Id.
   * @returns {{Promise<Array>}}
   */
  async getSignatureRemovalHistoryByWorkflowId(workflowId) {
    return await models.signatureRemovalHistory.getByWorkflowId(workflowId);
  }

  /**
   * Delete p7s.
   * @param {string} id ID.
   * @returns {Promise<object>}
   */
  async deleteP7s(id) {
    return await this.fileStorageService.deleteP7s(id);
  }
}

module.exports = WorkflowProcessBusiness;
