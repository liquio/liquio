
const Controller = require('./controller');
const WorkflowTemplateCategoryModel = require('../models/workflow_template_category');

/**
 * Workflow template category controller.
 */
class WorkflowTemplateCategoryController extends Controller {
  /**
   * Workflow template controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowTemplateCategoryController.singleton) {
      super(config);
      this.workflowTemplateCategoryModel = new WorkflowTemplateCategoryModel();
      WorkflowTemplateCategoryController.singleton = this;
    }
    return WorkflowTemplateCategoryController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Get workflow template categories.
    let workflowTemplateCategories;
    try {
      workflowTemplateCategories = await this.workflowTemplateCategoryModel.getAll();
      workflowTemplateCategories = this.filterResponse(workflowTemplateCategories, true);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, workflowTemplateCategories);
  }
}

module.exports = WorkflowTemplateCategoryController;
