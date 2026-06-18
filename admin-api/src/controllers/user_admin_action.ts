const { matchedData } = require('express-validator');

const Controller = require('./controller');
const UserAdminActionBusiness = require('../businesses/user_admin_action');

/**
 * User admin action controller.
 */
class UserAdminActionController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserAdminActionController.singleton) {
      super(config);
      this.userAdminActionBusiness = new UserAdminActionBusiness(config);
      UserAdminActionController.singleton = this;
    }
    return UserAdminActionController.singleton;
  }

  /**
   * Get list.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getList(req, res) {
    // Define params.
    const paramsData = matchedData(req, { locations: ['query'] });
    const { offset, limit, filter = {} } = paramsData;

    // Normalize date filter if need it.
    if (filter && filter.from_created_at) {
      filter.created_at_from = filter.from_created_at.length === 10 ? `${filter.from_created_at}T00:00:00.000Z` : filter.from_created_at;
    }
    if (filter && filter.to_created_at) {
      filter.created_at_to = filter.to_created_at.length === 10 ? `${filter.to_created_at}T23:59:59.999Z` : filter.to_created_at;
    }

    // Get user admin actions.
    let userAdminActionList;
    try {
      userAdminActionList = await this.userAdminActionBusiness.getList({ offset, limit, filter });
      if (!userAdminActionList || !userAdminActionList.data) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response login history with pagination.
    this.responseData(res, userAdminActionList, true);
  }
}

module.exports = UserAdminActionController;
