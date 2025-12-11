const Controller = require('./controller');
const ContainerModel = require('../models/container');

/**
 * Containers controller.
 */
class ContainersController extends Controller {
  /**
   * Containers controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!ContainersController.singleton) {
      super(config);
      this.containerModel = new ContainerModel();
      ContainersController.singleton = this;
    }
    return ContainersController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Define params.
    const { offset, limit, parent_id } = { offset: 0, limit: 20, ...req.query };
    let filter = {};
    if (parent_id) {
      filter.parent_id = parseInt(parent_id);
    }

    // Get containers.
    let containersModelResponse;
    try {
      containersModelResponse = await this.containerModel.getAll({
        offset: parseInt(offset),
        limit: Math.min(parseInt(limit), this.config.pagination.maxLimit),
        filter,
      });
    } catch (error) {
      log.save('get-containers-error', { error: error && error.message });
    }
    const { data: containers, meta } = containersModelResponse || {};

    // Response.
    this.responseData(res, containers, meta);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const { id } = req.params;

    // Get container.
    let containerModelResponse;
    try {
      containerModelResponse = await this.containerModel.findById(parseInt(id));
    } catch (error) {
      log.save('get-container-by-id-error', { error: error && error.message });
    }
    const { data: container } = containerModelResponse || {};

    // Check.
    if (!container) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseData(res, container);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    // Define params.
    const { name, description, parentId, meta } = req.body;
    const { user } = req.auth;

    // Get containers.
    let containerModelResponse;
    try {
      containerModelResponse = await this.containerModel.create({ name, description, parentId, meta, user });
    } catch (error) {
      log.save('create-container-error', { error: error && error.message });
    }
    const { data: container } = containerModelResponse || {};

    // Check.
    if (!container) {
      return this.responseError(res, 'Can not create.', 500);
    }

    // Response.
    this.responseData(res, container);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    // Define params.
    const { id } = req.params;
    const { name, description, parentId, meta } = req.body;
    const { user } = req.auth;

    // Get containers.
    let containerModelResponse;
    try {
      containerModelResponse = await this.containerModel.update(parseInt(id), { name, description, parentId, meta, user });
    } catch (error) {
      log.save('update-container-error', { error: error && error.message });
    }
    const { data: container } = containerModelResponse || {};

    // Check.
    if (!container) {
      return this.responseError(res, 'Can not update.', 500);
    }

    // Response.
    this.responseData(res, container);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    // Define params.
    const { id } = req.params;

    // Delete container.
    let deletedRowsCountModelResponse;
    try {
      deletedRowsCountModelResponse = await this.containerModel.delete(parseInt(id));
    } catch (error) {
      log.save('delete-container-error', { error: error && error.message });
    }
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};

    // Check.
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Can not delete.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }
}

// Export.
module.exports = ContainersController;
