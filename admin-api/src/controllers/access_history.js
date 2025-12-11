const { matchedData } = require('express-validator');

const Controller = require('./controller');
const AccessHistoryBusiness = require('../businesses/access_history');

/**
 * Access history controller.
 */
class AccessHistoryController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AccessHistoryController.singleton) {
      super(config);
      this.accessHistoryBusiness = new AccessHistoryBusiness();
      AccessHistoryController.singleton = this;
    }
    return AccessHistoryController.singleton;
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

    let accessHistory;
    try {
      accessHistory = await this.accessHistoryBusiness.getAll({
        currentPage,
        perPage,
        sort: sort,
        filters: filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, accessHistory, true);
  }
}

module.exports = AccessHistoryController;
