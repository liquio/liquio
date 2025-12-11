const { matchedData } = require('express-validator');

const Controller = require('./controller');
const UIFilterBusiness = require('../businesses/ui_filter');
const UIFilterEntity = require('../entities/ui_filter');

/**
 * UI Filter controller.
 */
class UIFilterController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UIFilterController.singleton) {
      super(config);
      this.uiFilterBusiness = new UIFilterBusiness();
      UIFilterController.singleton = this;
    }
    return UIFilterController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedUIFilterEntity;
    try {
      const bodyData = matchedData(req, { locations: ['body'] });

      const uiFilterEntity = new UIFilterEntity(bodyData);

      savedUIFilterEntity = await this.uiFilterBusiness.createOrUpdate(uiFilterEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-created-ui-filter', { user, data: savedUIFilterEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedUIFilterEntity);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    let savedUIFilterEntity;
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const bodyData = matchedData(req, { locations: ['body'] });

      const uiFilterEntity = new UIFilterEntity({
        id,
        ...bodyData,
      });

      savedUIFilterEntity = await this.uiFilterBusiness.createOrUpdate(uiFilterEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-updated-ui-filter', { user, data: savedUIFilterEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedUIFilterEntity);
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
    const { page: currentPage, count: perPage } = queryData;

    let uiFilters;
    try {
      uiFilters = await this.uiFilterBusiness.getAll({
        currentPage,
        perPage,
        sort: sort,
        filters: filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, uiFilters, true);
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
      await this.uiFilterBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-deleted-ui-filter', { user, data: { id } });
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
    let uiFilter;

    try {
      uiFilter = await this.uiFilterBusiness.findById(id);
      if (!uiFilter) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, uiFilter);
  }
}

module.exports = UIFilterController;
