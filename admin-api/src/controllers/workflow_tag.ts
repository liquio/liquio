const { matchedData } = require('express-validator');

const Controller = require('./controller');
const WorkflowBusiness = require('../businesses/workflow');

/**
 * Workflow controller.
 */
class WorkflowTagController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!WorkflowTagController.singleton) {
      super(config);
      this.workflowBusiness = new WorkflowBusiness();
      WorkflowTagController.singleton = this;
    }
    return WorkflowTagController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    try {
      const params = matchedData(req, { locations: ['body'] });

      // Append user ID.
      params.createdBy = req.authUserId;
      params.updatedBy = req.authUserId;

      const tag = await this.workflowBusiness.createTag(params);

      return this.responseData(res, tag, false, 201);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    try {
      const { id, name, color, description } = matchedData(req, { locations: ['params', 'body'] });

      const tag = await this.workflowBusiness.updateTag(id, { name, color, description, updatedBy: req.authUserId });

      return this.responseData(res, tag);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    try {
      const params = matchedData(req, { locations: ['query'] });

      const result = await this.workflowBusiness.getAllTags(params);

      return this.responseData(res, result, true);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    try {
      const data = matchedData(req, { locations: ['params'] });

      const tag = await this.workflowBusiness.getTagById(data.id);

      return this.responseData(res, tag);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Delete tag.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });

      const result = await this.workflowBusiness.deleteTag(id);

      return this.responseData(res, result);
    } catch (error) {
      return this.responseError(res, error);
    }
  }
}

module.exports = WorkflowTagController;
