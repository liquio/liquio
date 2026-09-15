import { Controller } from './controller';
import { WorkflowStatusBusiness } from '../businesses/workflow_status';

/**
 * Workflow status controller.
 */
export class WorkflowStatusController extends Controller {
  private static singleton: WorkflowStatusController;

  private workflowStatusBusiness: WorkflowStatusBusiness;

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
