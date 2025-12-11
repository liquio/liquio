const Controller = require('./controller');
const WorkflowStatusBusiness = require('../businesses/workflow_status');

/**
 * Workflow status controller.
 */
class WorkflowStatusController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowStatusController.singleton) {
      super(config);
      this.workflowStatusBusiness = new WorkflowStatusBusiness();
      WorkflowStatusController.singleton = this;
    }
    return WorkflowStatusController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    let workflowStatuses;
    try {
      workflowStatuses = await this.workflowStatusBusiness.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, workflowStatuses);
  }
}

module.exports = WorkflowStatusController;
