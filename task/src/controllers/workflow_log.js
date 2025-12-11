
const { matchedData } = require('express-validator');
const Controller = require('./controller');
const WorkflowLoggerService = require('../services/workflow_logger');

/**
 * Workflow log controller.
 */
class WorkflowLogController extends Controller {
  constructor() {
    // Define singleton.
    if (!WorkflowLogController.singleton) {
      super();
      this.workflowLoggerService = new WorkflowLoggerService();
      WorkflowLogController.singleton = this;
    }
    return WorkflowLogController.singleton;
  }

  /**
   * Find workflow by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const id = req.params.id;
    const userRoles = this.getRequestUserRoles(req);

    let workflow;
    try {
      workflow = await this.workflowLoggerService.findById(id, userRoles);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, workflow);
  }

  /**
   * Get workflows.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getWorkflows(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const { workflow_template_id, from_created_at, to_created_at, page, count } = queryData;

    let workflows;
    try {
      workflows = await models.workflow.getAll({
        workflowTemplateId: workflow_template_id,
        fromCreatedAt: from_created_at,
        toCreatedAt: to_created_at,
        currentPage: page,
        perPage: count
      });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, workflows, true);
  }

  /**
   * Get workflows by updated at.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getWorkflowsByUpdatedAt(req, res) {
    const { date, workflow_template_id: workflowTemplateId, page, count, sort } = matchedData(req, { locations: ['query'] });

    let workflows;
    try {
      workflows = await models.workflow.getWorkflowsByUpdatedAt({
        date,
        workflowTemplateId,
        currentPage: page,
        perPage: count,
        sort
      });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, workflows, true);
  }
}

module.exports = WorkflowLogController;
