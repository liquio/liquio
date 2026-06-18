/**
 * Workflow status business.
 */
class WorkflowStatusBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowStatusBusiness.singleton) {
      this.config = config;
      WorkflowStatusBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowStatusBusiness.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowStatusEntity[]>}
   */
  async getAll() {
    return await models.workflowStatus.getAll();
  }
}

module.exports = WorkflowStatusBusiness;
