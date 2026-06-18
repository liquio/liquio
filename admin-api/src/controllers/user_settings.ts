const { matchedData } = require('express-validator');

const Controller = require('./controller');
const UserSettingsBusiness = require('../businesses/user_settings');
const { UnauthorizedError } = require('../lib/errors');

/**
 * User settings controller.
 */
class UserSettingsController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserSettingsController.singleton) {
      super(config);
      this.userSettingsBusiness = new UserSettingsBusiness();
      UserSettingsController.singleton = this;
    }
    return UserSettingsController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async get(req, res) {
    if (!req?.authUserInfo && !req?.authUserInfo?.userId) {
      return this.responseError(res, new UnauthorizedError('Unauthorized user'));
    }

    try {
      const userSettings = await this.userSettingsBusiness.get(req.authUserInfo.userId);
      this.responseData(res, userSettings);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Create or update user settings.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createOrUpdate(req, res) {
    const bodyData = matchedData(req, { locations: ['body'] });

    if (!req?.authUserInfo && !req?.authUserInfo?.userId) {
      return this.responseError(res, new UnauthorizedError('Unauthorized user'));
    }

    try {
      const userSettings = await this.userSettingsBusiness.createOrUpdate(req.authUserInfo.userId, bodyData);
      this.responseData(res, userSettings);
    } catch (error) {
      return this.responseError(res, error);
    }
  }
}

module.exports = UserSettingsController;
