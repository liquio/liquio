const { matchedData } = require('express-validator');

const Controller = require('./controller');
const LoginHistoryBusiness = require('../businesses/login_history');

/**
 * Login history controller.
 */
class LoginHistoryController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!LoginHistoryController.singleton) {
      super(config);
      this.loginHistoryBusiness = new LoginHistoryBusiness(config);
      LoginHistoryController.singleton = this;
    }
    return LoginHistoryController.singleton;
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

    // Handle client IDs.
    const { allowedClientIds = [] } = global.config.auth;
    if (allowedClientIds.length > 0) {
      if (filter.client_id) {
        // Check client IDs filter accordance to allowed list.
        if (filter.client_id.split(',').some((v) => !allowedClientIds.includes(v))) {
          return this.responseError(res, 'Client IDs filter includes not allowed records.', 400, {
            allowedClientIds,
            requestedClientIds: filter.client_id.split(','),
          });
        }
      } else {
        // Set client IDs filter accordance to allowed list.
        filter.client_id = allowedClientIds.join(',');
      }
    }

    // Get login history.
    let loginHistory;
    try {
      loginHistory = await this.loginHistoryBusiness.getList({ offset, limit, filter });
      if (!loginHistory || !loginHistory.data) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response login history with pagination.
    this.responseData(res, loginHistory, true);
  }
}

module.exports = LoginHistoryController;
