/**
 * Workflow category business.
 */
class WorkflowCategoryBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowCategoryBusiness.singleton) {
      this.config = config;
      WorkflowCategoryBusiness.singleton = this;
    }

    // Return singleton.
    return WorkflowCategoryBusiness.singleton;
  }

  /**
   * Create or update workflow template category.
   * @param {WorkflowTemplateCategoryEntity} workflowTemplateCategoryEntity Workflow Template Category Entity.
   * @returns {Promise<WorkflowTemplateCategoryEntity>}
   */
  async createOrUpdate(workflowTemplateCategoryEntity) {
    return await models.workflowTemplateCategory.create(workflowTemplateCategoryEntity);
  }

  /**
   * Get workflow template categories.
   * @returns {Promise<WorkflowTemplateCategoryEntity[]>}
   */
  async getWorkflowCategories(params) {
    return await models.workflowTemplateCategory.getAllWithPagination({
      ...params,
    });
  }

  /**
   * Delete workflow template category by ID.
   * @param {number} id Workflow template ID.
   * @returns {Promise<WorkflowTemplateCategoryEntity>}
   */
  async deleteById(id) {
    return await models.workflowTemplateCategory.deleteById(id);
  }

  /**
   * Find workflow template category by ID.
   * @param {number} id Workflow template ID.
   * @returns {Promise<WorkflowTemplateCategoryEntity>}
   */
  async findById(id) {
    return await models.workflowTemplateCategory.findById(id);
  }
}

module.exports = WorkflowCategoryBusiness;
