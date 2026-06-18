const { matchedData } = require('express-validator');

const Controller = require('./controller');

/**
 * Workflow category controller.
 */
class ProxyItemController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!ProxyItemController.singleton) {
      super(config);
      ProxyItemController.singleton = this;
    }
    return ProxyItemController.singleton;
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    let item;
    try {
      item = await models.proxyItem.findById(id);
      if (!item) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, item);
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    let list;
    try {
      list = await models.proxyItem.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, list);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    const bodyData = matchedData(req, { locations: ['body'] });

    let savedItem;
    try {
      savedItem = await models.proxyItem.create(bodyData);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedItem);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const bodyData = matchedData(req, { locations: ['body'] });

    let savedItem;
    try {
      savedItem = await models.proxyItem.update(id, bodyData);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedItem);
  }

  /**
   * Delete by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
      await models.proxyItem.deleteById(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseThatAccepted(res);
  }
}

module.exports = ProxyItemController;
