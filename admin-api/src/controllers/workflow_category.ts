const { matchedData } = require('express-validator');

const Controller = require('./controller');
const WorkflowCategoryBusiness = require('../businesses/workflow_category');
const WorkflowTemplateCategoryEntity = require('../entities/workflow_template_category');

/**
 * Workflow category controller.
 */
class WorkflowCategoryController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowCategoryController.singleton) {
      super(config);
      this.workflowCategoryBusiness = new WorkflowCategoryBusiness();
      WorkflowCategoryController.singleton = this;
    }
    return WorkflowCategoryController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedWorkflowTemplateCategoryEntity;
    try {
      const bodyData = matchedData(req, { locations: ['body'] });

      const workflowTemplateEntity = new WorkflowTemplateCategoryEntity(bodyData);

      savedWorkflowTemplateCategoryEntity = await this.workflowCategoryBusiness.createOrUpdate(workflowTemplateEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-created-workflow-category', { user, data: savedWorkflowTemplateCategoryEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedWorkflowTemplateCategoryEntity);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    let savedWorkflowTemplateCategoryEntity;
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const bodyData = matchedData(req, { locations: ['body'] });

      const workflowTemplateEntity = new WorkflowTemplateCategoryEntity({
        id,
        ...bodyData,
      });

      savedWorkflowTemplateCategoryEntity = await this.workflowCategoryBusiness.createOrUpdate(workflowTemplateEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-updated-workflow-category', { user, data: savedWorkflowTemplateCategoryEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedWorkflowTemplateCategoryEntity);
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

    const { page, count } = queryData;

    let bpmnWorkflows;
    try {
      bpmnWorkflows = await this.workflowCategoryBusiness.getWorkflowCategories({
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
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
      await this.workflowCategoryBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-deleted-workflow-category', { user, data: { id } });
    } catch (error) {
      return this.responseError(res, error);
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
      bpmnWorkflow = await this.workflowCategoryBusiness.findById(id);
      if (!bpmnWorkflow) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, bpmnWorkflow);
  }
}

module.exports = WorkflowCategoryController;
