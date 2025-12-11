const _ = require('lodash');
const axios = require('axios');

const { JSONPath } = require('../lib/jsonpath');
const Business = require('./business');
const XmlJsConverter = require('../lib/xml_js_converter');
const Eds = require('../lib/eds');
const StorageService = require('../services/storage');
const Sandbox = require('../lib/sandbox');
const typeOf = require('../lib/type_of');
const { EvaluateSchemaFunctionError, NotFoundError, ForbiddenError } = require('../lib/errors');
const { ERROR_WORKFLOW_NOT_FOUND, ERROR_WORKFLOW_ACCESS } = require('../constants/error');

const ELASTIC_FIELDS_SEARCH_MAP = {
  number: 'selected_number',
  workflow_template: 'selected_userworkflowTemplate',
  user_data: 'selected_userId',
  has_errors: 'selected_isWorkflowContainsErrors',
  name: 'selected_search_text',
  workflow_status_id: 'selected_workflowStatusId',
  has_unresolved_errors: 'selected_hasUnresolvedErrors',
  type: 'type',
  createdAt: {
    start: 'selected_createdAt_range_start',
    end: 'selected_createdAt_range_end',
  },
  selected_size: 'selected_size',
  selected_from: 'selected_from',
};
const ELASTIC_FIELDS_SORT_MAP = {
  created_at: 'selected_sort_createdAt',
};

// INFO: Fields in response, other will be skipped.
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
];

/**
 * Workflow business.
 * @typedef {import('../entities/workflow')} WorkflowEntity
 */
class WorkflowBusiness extends Business {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowBusiness.singleton) {
      super(config);
      this.xmlJsConverter = new XmlJsConverter();
      this.eds = new Eds(config.eds);
      this.storageService = new StorageService();
      this.sandbox = new Sandbox();
      WorkflowBusiness.singleton = this;
    }
    return WorkflowBusiness.singleton;
  }

  /**
   * Get all workflow by user ID.
   * @param {string} userId User ID.
   * @param {object} params Params.
   * @returns {Promise<WorkflowEntity>} Workflow entity.
   */
  async getAllByUserId(userId, params) {
    let workflows = await models.workflow.getAllByUserId(userId, {
      ...params,
    });

    for (let workflow of workflows.data) {
      const { name = null, description = null } = await this.getLastStepLabel(workflow);
      workflow.lastStepLabel = name;
      workflow.lastStepDescription = description;
      if (!workflow.lastStepLabel && !workflow.lastStepDescription && !(workflow.statuses?.length > 0) && workflow.workflowStatusId !== null) {
        workflow.events = await global.models.event.getEventsByWorkflowId(workflow.id);
        workflow.documents = await global.models.document.getAllByWorkflowId({ workflowId: workflow.id });
        workflow.statuses = this.calculateReserveStatuses(workflow);
      }
    }

    return workflows;
  }

  /**
   * Find by ID.
   * @param {string} id Workflow ID.
   * @param {string} userId User ID.
   * @param {{all: number[], head: number[], member: number[]}} userUnitIds User units IDs.
   * @returns {Promise<WorkflowEntity>} Workflow entity.
   */
  async findById(id, userId, userUnitIds) {
    // Get workflow.
    let workflow = await models.workflow.findById(id, { with: ['tasks', 'events'] });
    if (!workflow) {
      throw new NotFoundError(ERROR_WORKFLOW_NOT_FOUND);
    }

    // Check access.
    const hasAccess = workflow.hasAccess(userId, userUnitIds);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_WORKFLOW_ACCESS);
    }

    // Append extra data to workflow.
    workflow = await this.appendEntryTaskInfo(workflow);
    workflow.timeline = await this.prepareTimeline(workflow);
    if (workflow.timeline.length === 0 && !(workflow.statuses?.length > 0) && workflow.workflowStatusId !== null) {
      workflow.events = await global.models.event.getEventsByWorkflowId(workflow.id);
      workflow.documents = await global.models.document.getAllByWorkflowId({ workflowId: workflow.id });
      workflow.statuses = this.calculateReserveStatuses(workflow);
    }
    const allFiles = await businesses.document.getFilesToPreview(id, undefined, undefined, undefined, undefined, true);
    const { workflowFilesFilter = '(item) => true' } = global.config.files_filter || {};
    const workflowFilesFilterFunction = this.sandbox.eval(workflowFilesFilter);
    workflow.files = allFiles
      .filter(
        (v) =>
          (v.taskPerformerUsers || []).includes(userId) ||
          (v.taskPerformerUnits || []).some((u) => userUnitIds.all.includes(u)) ||
          (v.taskObserverUnits || []).some((u) => userUnitIds.all.includes(u)) ||
          (v.documentTemplateAccess.workflowFiles && v.documentTemplateAccess.workflowFiles.public) ||
          (v.documentTemplateAccess.workflowFiles && v.documentTemplateAccess.workflowFiles.workflowCreator && workflow.createdBy === userId) ||
          (v.eventTemplateAccess.workflowFiles && v.eventTemplateAccess.workflowFiles.public) ||
          (v.eventTemplateAccess.workflowFiles && v.eventTemplateAccess.workflowFiles.workflowCreator && workflow.createdBy === userId) ||
          (v.createdByUnitHeads || []).some((u) => userUnitIds.head.includes(u)) ||
          (v.createdByUnits || []).some((u) => userUnitIds.all.includes(u)),
      )
      .filter(({ fileLink }, index, self) => self.findIndex((v) => v.fileLink === fileLink) === index)
      .filter(workflowFilesFilterFunction);
    workflow.info = await this.getWorkflowInfo(workflow);
    const files = workflow.files || [];
    const p7sMetadata = await this.storageService.provider.getP7sMetadata(files.map((v) => v.fileLink));
    const documentSignaturesPromises = files.map((v) => models.documentSignature.getByDocumentId(v.documentId));
    const documentSignatures = await Promise.all(documentSignaturesPromises);

    // Add signer info.
    for (let i = 0; i < files.length; i++) {
      files[i].hasP7sSignature = p7sMetadata.some((v) => v.file_id === files[i].fileLink);
      const docSignature = documentSignatures.find((el) => el[0] && el[0].documentId === files[i].documentId);
      const signaturesInfoParse = docSignature && docSignature[0] && docSignature[0].signature ? JSON.parse(docSignature[0].signature) : [];
      const signature = signaturesInfoParse && signaturesInfoParse[0];
      try {
        const { signer, issuer, signTime } = await this.eds.getSignatureInfo(signature);
        files[i].signature = { signer, issuer, signTime };
      } catch (error) {
        log.save('Can not get signature info', error, 'warn');
      }
    }

    return workflow;
  }

  /**
   * Has task template ID in bpmn schema.
   * @param {object} xmlBpmnSchema Workflow template XML schema.
   * @param {number} taskTemplateId Task template ID.
   * @returns {Promise<boolean>}
   */
  async hasTaskTemplateIdInBpmnSchema(xmlBpmnSchema, taskTemplateId) {
    const entityNamesOfBpmnSchema = await this.getEntityNamesOfBpmnSchema(xmlBpmnSchema);

    return entityNamesOfBpmnSchema.some((v) => v.toLowerCase() === `task-${taskTemplateId}`);
  }

  /**
   * Get entity names of BPMN schema.
   * @param {WorkflowTemplateEntity} workflowTemplate Workflow template entity.
   * @returns {Promise<string[]>}
   */
  async getEntityNamesOfBpmnSchema(xmlBpmnSchema) {
    const bpmnSchema = await this.xmlJsConverter.convertXmlToJsObject(xmlBpmnSchema.replace(/bpmn2:/g, 'bpmn:'));

    const sourceRef = JSONPath('$..sourceRef', bpmnSchema);
    const targetRef = JSONPath('$..targetRef', bpmnSchema);
    const references = [...new Set(sourceRef.concat(targetRef))];

    return references;
  }

  /**
   * Get last step label.
   * @private
   * @param {WorkflowEntity} workflow Workflow entity.
   * @returns {object}
   */
  async getLastStepLabel(workflow) {
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
   * Prepare workflow template.
   * @private
   * @param {WorkflowEntity} workflow Workflow entity.
   * @returns {Promise<{label: string, description: string, createdAt: string, finishedAt: string}[]>}
   */
  async prepareTimeline(workflow) {
    let timeline = [];

    const { steps = [], messages = [] } = this.getTimelineStepsAndMessages(workflow) || {};
    if (!steps.length || !steps.length) {
      return timeline;
    }

    const tasks = workflow.tasks || [];
    const events = workflow.events || [];

    for (const message of messages) {
      for (const sequence of message.sequences) {
        if (typeof sequence.sourceRef === 'undefined') {
          continue;
        }

        if (/task-/.test(sequence.sourceRef)) {
          const taskTemplateId = parseInt(sequence.sourceRef.replace(/task-/, ''));

          const step = steps.find((v) => v.taskTemplateId === taskTemplateId);
          const index = tasks.findIndex((v) => v.taskTemplateId === taskTemplateId);
          const task = tasks[index];
          if (index > -1) {
            tasks.splice(index, 1);
          }

          if (!step || !task) {
            continue;
          }
          timeline.push({
            label: step.label,
            description: step.description,
            type: 'task',
            createdAt: task.createdAt,
            finishedAt: task.finishedAt,
          });
        } else if (/event-/.test(sequence.sourceRef)) {
          const eventTemplateId = parseInt(sequence.sourceRef.replace(/event-/, ''));

          const step = steps.find((v) => v.eventTemplateId === eventTemplateId);
          const index = events.findIndex((v) => v.eventTemplateId === eventTemplateId);
          const event = events[index];
          if (index > -1) {
            events.splice(index, 1);
          }

          if (!step || !event) {
            continue;
          }
          timeline.push({
            label: step.label,
            description: step.description,
            type: 'event',
            createdAt: event.createdAt,
            finishedAt: event.createdAt,
          });
        }
      }
    }

    return timeline;
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
   * Prepare workflow template.
   * @private
   * @param {WorkflowEntity} workflow Workflow entity.
   * @returns {Promise<object[]>}
   */
  async getWorkflowInfo(workflow) {
    if (!workflow.workflowTemplate.data.info) {
      return [];
    }

    return workflow.workflowTemplate.data.info;
  }

  /**
   * Get entry task info.
   * @private
   * @param {WorkflowEntity} workflow Workflow entity.
   * @returns {Promise<WorkflowEntity>}
   */
  async appendEntryTaskInfo(workflow) {
    const tasks = await workflow.tasks;
    if (tasks) {
      const entryTask = tasks.find((v) => v.isEntry === true);

      if (entryTask) {
        workflow.entryTaskId = entryTask.id;
        workflow.entryTaskFinishedAt = entryTask.finishedAt;

        const lastEntryTask = tasks
          .filter(({ finished }) => finished)
          .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
          .find(({ taskTemplateId }) => taskTemplateId === entryTask.taskTemplateId);

        workflow.lastEntryTaskId = lastEntryTask?.id;
        workflow.lastEntryTaskFinishedAt = lastEntryTask?.finishedAt;
      }

      return workflow;
    }
  }

  /**
   * @param params
   * @return {Promise<*>}
   */
  async getAllElasticFiltered(params = {}) {
    const { currentPage, perPage, sort, filters } = { ...params };
    let querySearchParams = {};
    let querySortParams = {};

    // Map request filter fields names to elastic fields names.
    for (const key in filters) {
      if (!ELASTIC_FIELDS_SEARCH_MAP[key]) continue;
      const mapped = ELASTIC_FIELDS_SEARCH_MAP[key];
      if (typeof mapped === 'string') {
        querySearchParams[mapped] = filters[key];
      } else {
        querySearchParams[mapped.start] = filters[key];
        querySearchParams[mapped.end] = filters[key];
      }
    }
    // Map request sort fields names to elastic fields names.
    for (const key in sort) {
      if (!ELASTIC_FIELDS_SORT_MAP[key]) continue;
      querySortParams[ELASTIC_FIELDS_SORT_MAP[key]] = sort[key].toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
    // Default sort if request sort is empty.
    if (!Object.keys(querySortParams).length) querySortParams = { selected_sort_createdAt: 'desc' };

    /** @see LOG_ADMIN_REQUEST_EXAMPLE_v2 */
    const body = {
      id: this.config.workflow.elastic.template,
      params: {
        ...querySearchParams,
        ...querySortParams,
        selected_size: perPage,
        selected_from: (currentPage - 1) * perPage,
      },
    };
    const response = await axios({
      url: this.config.workflow.elastic.protocol + '://' + this.config.workflow.elastic.host + this.config.workflow.elastic.uri,
      method: this.config.workflow.elastic.method,
      headers: this.config.workflow.elastic.headers,
      data: body,
      timeout: this.config.workflow.elastic.timeout || 30000,
    });
    const data = response.data;
    let total = data.hits.total.value;
    let parsedResponse = data.hits.hits.map((element) => {
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
            case 'workflow_outgoing_message':
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
   * Set workflow status.
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
      const { template, replace } = global.config.mapping?.taskBusiness?.frontUrl || {};
      if (typeOf(template) === 'string' && typeOf(replace) === 'string') {
        status.calculate = status.calculate.replaceAll(template, replace);
      }

      const calculatedStatus = this.sandbox.evalWithArgs(status.calculate, [documents, events], {
        meta: { fn: 'workflow.status.calculate', workflowId, taskTemplateId },
      });
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
      log.save('set-workflow-status|status-defined', { workflowId, statusId, calculatedStatus, workflowTemplateId: workflowTemplate.id });
    } else if (status.statusId) {
      await models.workflow.setStatus(workflowId, status.statusId);
      log.save('set-workflow-status|status-defined', { workflowId, statusId: status.statusId, workflowTemplateId: workflowTemplate.id });
    }
  }

  /**
   * Calculate reserve status.
   * Calling in case current workflow happened with unfunctional statuses, but then workwlow template changed with functional statuses.
   * @private
   * @param {object} workflow Workflow.
   * @param {object[]} statuses Calculated statuses.
   */
  calculateReserveStatuses(workflow) {
    const {
      events = [],
      documents = [],
      workflowTemplate,
      data: { messages: workflowMessages = [] },
    } = workflow;
    const workflowTemplateStatuses = workflowTemplate.data.statuses;
    const incomingMessagesFromTasksAndEvents = workflowMessages.filter(
      (message) => message?.type === 'in' && message?.sequences?.every((sequence) => /^(task|event)-[0-9]+$/.test(sequence.sourceRef)),
    );

    const { template, replace } = global.config.mapping?.taskBusiness?.frontUrl || {};
    const shouldReplaceFronUrl = typeOf(template) === 'string' && typeOf(replace) === 'string';

    let lastCalculetedStatuses = [];

    for (const message of incomingMessagesFromTasksAndEvents) {
      for (const sequence of message.sequences) {
        if (typeof sequence.sourceRef === 'undefined') {
          continue;
        }

        if (/task-/.test(sequence.sourceRef)) {
          const taskTemplateId = parseInt(sequence.sourceRef.replace(/task-/, ''));
          const status = workflowTemplateStatuses.find((s) => s.taskTemplateId === taskTemplateId);
          if (!status?.calculate) continue;

          if (shouldReplaceFronUrl) {
            status.calculate = status.calculate.replaceAll(template, replace);
          }

          let calculatedStatuses;
          try {
            calculatedStatuses = this.sandbox.evalWithArgs(status.calculate, [documents, events], {
              meta: { fn: 'workflow.status.calculate', workflowId: workflow.id },
            });
          } catch (error) {
            throw new EvaluateSchemaFunctionError(`workflow.status.calculate function throw error ${error.toString()}`);
          }

          if (!Array.isArray(calculatedStatuses) || calculatedStatuses.length === 0) {
            continue;
          }
          lastCalculetedStatuses = calculatedStatuses;
        } else if (/event-/.test(sequence.sourceRef)) {
          const eventTemplateId = parseInt(sequence.sourceRef.replace(/event-/, ''));
          const status = workflowTemplateStatuses.find((s) => s.eventTemplateId === eventTemplateId);
          if (!status?.calculate) continue;

          if (shouldReplaceFronUrl) {
            status.calculate = status.calculate.replaceAll(template, replace);
          }

          let calculatedStatuses;
          try {
            calculatedStatuses = this.sandbox.evalWithArgs(status.calculate, [documents, events], {
              meta: { fn: 'workflow.status.calculate', workflowId: workflow.id },
            });
          } catch (error) {
            throw new EvaluateSchemaFunctionError(`workflow.status.calculate function throw error ${error.toString()}`);
          }

          if (!Array.isArray(calculatedStatuses) || calculatedStatuses.length === 0) {
            continue;
          }
          lastCalculetedStatuses = calculatedStatuses;
        }
      }
    }
    return lastCalculetedStatuses;
  }
}

module.exports = WorkflowBusiness;
