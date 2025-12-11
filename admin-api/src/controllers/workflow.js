const { matchedData } = require('express-validator');

const Exceptions = require('../exceptions');
const Controller = require('./controller');
const WorkflowBusiness = require('../businesses/workflow');
const BpmnWorkflowBusiness = require('../businesses/bpmn_workflow');
const WorkflowTemplateEntity = require('../entities/workflow_template');

const MAX_TAGS_PER_WORKFLOW_TEMPLATE = 10;

/**
 * Workflow controller.
 */
class WorkflowController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowController.singleton) {
      super(config);
      this.workflowBusiness = new WorkflowBusiness();
      this.bpmnWorkflowBusiness = new BpmnWorkflowBusiness();
      WorkflowController.singleton = this;
    }
    return WorkflowController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedWorkflowTemplateEntity;
    try {
      const bodyData = matchedData(req, { locations: ['body'] });
      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }
      if (!bodyData.id) {
        const { id } = await this.workflowBusiness.getLastWorkflow() || { id: 0 };
        bodyData.id = id + 1;
      } else if (bodyData.id > 999999) {
        return this.responseError(res, 'Workflow template ID must be less than 999999.');
      }

      const workflowTemplateEntity = new WorkflowTemplateEntity(bodyData);

      savedWorkflowTemplateEntity = await this.workflowBusiness.create(workflowTemplateEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-created-workflow', { user, data: savedWorkflowTemplateEntity });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, savedWorkflowTemplateEntity);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    let savedWorkflowTemplateEntity;

    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const bodyData = matchedData(req, { locations: ['body'] });

      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      const unitIds = req.authUserUnitIds;
      const workflowTemplate = await this.workflowBusiness.findById(id, { unitIds });
      if (!workflowTemplate) {
        return this.responseError(res, 'Not found.', 404);
      }

      const lastWorkflowHistory = await this.workflowBusiness.findLastWorkflowHistoryByWorkflowTemplateId(id);

      const lastWorkflowHistoryIdHeader = req.headers['last-workflow-history-id'];

      if (lastWorkflowHistory && lastWorkflowHistory.id !== lastWorkflowHistoryIdHeader) {
        const error = new Error('Header Last-Workflow-History-Id expired.');
        error.details = [{ lastWorkflowHistory: lastWorkflowHistory }];
        throw error;
      }

      const user = {
        ...this.getRequestUserBaseInfo(req),
        remoteAddress: req.connection.remoteAddress,
        xForwardedFor: req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      };

      const workflowTemplateEntity = new WorkflowTemplateEntity({
        id,
        ...bodyData,
      });

      savedWorkflowTemplateEntity = await this.workflowBusiness.update(workflowTemplateEntity);

      await log.save('user-updated-workflow', { user, data: savedWorkflowTemplateEntity });

      // Auto save workflow process.
      const workflowHistory = await this.bpmnWorkflowBusiness.autoSaveVersion(id, { user });

      const workflowWasCreated = workflowHistory && workflowHistory.id;
      const newLastWorkflowHistoryId = workflowWasCreated ? workflowHistory.id : lastWorkflowHistoryIdHeader;
      if (newLastWorkflowHistoryId) {
        res.setHeader('Last-Workflow-History-Id', newLastWorkflowHistoryId);
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseData(res, savedWorkflowTemplateEntity);
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
    const unitIds = req.authUserUnitIds;
    const userId = this.getRequestUserId(req);

    const { page, count, short } = queryData;
    if (short) {
      let shortWorkflows;
      try {
        shortWorkflows = await this.workflowBusiness.getShortWorkflows();
      } catch (error) {
        return this.responseError(res, error);
      }
      return this.responseData(res, shortWorkflows);
    }

    let bpmnWorkflows;
    try {
      bpmnWorkflows = await this.workflowBusiness.getWorkflows({
        unitIds,
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
        userId,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, bpmnWorkflows, true);
  }

  /**
   * Get all by schema search.
   * @param {e.Request} req HTTP request.
   * @param {e.Response} res HTTP response.
   */
  async getAllBySchemaSearch(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};
    const regexAsString = queryData.options?.regex_as_string === 'true' || false;
    const unitIds = req.authUserUnitIds;

    const { page, count } = queryData;

    let bpmnWorkflows;
    try {
      bpmnWorkflows = await this.workflowBusiness.getWorkflowsBySchemaSearch({
        unitIds,
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
        options: {
          regexAsString,
        },
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, bpmnWorkflows, true);
  }

  /**
   * Delete by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;

    try {
      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      await this.workflowBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-deleted-workflow', { user, data: { id } });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let bpmnWorkflow;

    try {
      bpmnWorkflow = await this.workflowBusiness.findById(id);

      const lastWorkflowHistory = await this.workflowBusiness.findLastWorkflowHistoryByWorkflowTemplateId(id);
      if (lastWorkflowHistory && lastWorkflowHistory.id) {
        bpmnWorkflow.lastWorkflowHistory = lastWorkflowHistory;
        res.setHeader('Last-Workflow-History-Id', lastWorkflowHistory.id);
      }
      if (!bpmnWorkflow) {
        return this.responseError(res, 'Not found.', 404);
      }
      bpmnWorkflow = this.filterResponse(bpmnWorkflow);

      // Append tags.
      bpmnWorkflow.tags = await this.workflowBusiness.getTagsByWorkflowTemplateId(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, bpmnWorkflow);
  }

  /**
   * Subscribe user on workflow errors by workflow ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async subscribeOnWorkflowErrors(req, res) {
    try {
      // Check workflowEditor disabled.
      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      // Get data to subscribing.
      const { id: workflowTemplateId } = matchedData(req, { locations: ['params'] });
      const {
        authUserInfo: { userId, email },
      } = req;
      const userData = { userId, email };

      // Check existing workflowTemplate.
      const workflowTemplate = await this.workflowBusiness.findById(workflowTemplateId);
      if (!workflowTemplate) {
        return this.responseError(res, 'Not found.', 404);
      }

      // Try to subscribe.
      const subscribingResult = await this.workflowBusiness.subscribeOnWorkflowErrors(workflowTemplateId, { userData });

      this.responseData(res, subscribingResult);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }
  }

  /**
   * Unsubscribe user from workflow errors by workflow ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async unsubscribeFromWorkflowErrors(req, res) {
    try {
      // Check workflowEditor disabled.
      if (config.workflow_editor.disabled === true) {
        throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.WORKFLOW_EDITOR);
      }

      // Get data to unsubscribing.
      const { id: workflowTemplateId } = matchedData(req, { locations: ['params'] });
      const {
        authUserInfo: { userId },
      } = req;
      const userData = { userId };

      // Check existing workflowTemplate.
      const workflowTemplate = await this.workflowBusiness.findById(workflowTemplateId);
      if (!workflowTemplate) {
        return this.responseError(res, 'Not found.', 404);
      }

      // Try to unsubscribe.
      const unsubscribingResult = await this.workflowBusiness.unsubscribeFromWorkflowErrors(workflowTemplateId, { userData });

      this.responseData(res, unsubscribingResult);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }
  }

  /**
   * Set tags for workflow template.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setWorkflowTemplateTags(req, res) {
    try {
      const { id: workflowTemplateId, tagIds } = matchedData(req, { locations: ['params', 'body'] });

      if (tagIds.length > MAX_TAGS_PER_WORKFLOW_TEMPLATE) {
        return this.responseError(res, 'Maximum tags per workflow template is 10.', 400);
      }

      const result = await this.workflowBusiness.setWorkflowTemplateTags(workflowTemplateId, tagIds);

      return this.responseData(res, result);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode || 500, error.details);
    }
  }
}

module.exports = WorkflowController;
