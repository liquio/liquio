const { matchedData } = require('express-validator');

const Controller = require('./controller');
const CustomInterfaceBusiness = require('../businesses/custom_interface');
const CustomInterfaceEntity = require('../entities/custom_interface');

/**
 * Custom interface controller.
 */
class CustomInterfaceController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!CustomInterfaceController.singleton) {
      super(config);
      this.customInterfaceBusiness = new CustomInterfaceBusiness();
      CustomInterfaceController.singleton = this;
    }
    return CustomInterfaceController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedCustomInterfaceEntity;
    try {
      const bodyData = matchedData(req, { locations: ['body'] });

      const customInterfaceEntity = new CustomInterfaceEntity(bodyData);

      savedCustomInterfaceEntity = await this.customInterfaceBusiness.createOrUpdate(customInterfaceEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-created-custom-interface', { user, data: savedCustomInterfaceEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedCustomInterfaceEntity);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    let savedCustomInterfaceEntity;
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const bodyData = matchedData(req, { locations: ['body'] });

      const customInterfaceEntity = new CustomInterfaceEntity({
        id,
        ...bodyData,
      });

      savedCustomInterfaceEntity = await this.customInterfaceBusiness.createOrUpdate(customInterfaceEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-updated-custom-interface', { user, data: savedCustomInterfaceEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedCustomInterfaceEntity);
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

    let customInterfaces;
    try {
      customInterfaces = await this.customInterfaceBusiness.getAll({
        currentPage,
        perPage,
        sort: sort,
        filters: filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, customInterfaces, true);
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
      await this.customInterfaceBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-deleted-custom-interface', { user, data: { id } });
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
    let customInterface;

    try {
      customInterface = await this.customInterfaceBusiness.findById(id);
      if (!customInterface) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, customInterface);
  }
}

module.exports = CustomInterfaceController;
