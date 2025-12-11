const UserSettingsModel = require('../models/user_settings');

/**
 * User settings business.
 */
class UserSettingsBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserSettingsBusiness.singleton) {
      this.config = config;
      this.userSettingsModel = new UserSettingsModel();
      UserSettingsBusiness.singleton = this;
    }

    // Return singleton.
    return UserSettingsBusiness.singleton;
  }

  /**
   * Get user settings.
   * @param {string} userId User ID.
   * @returns {Promise<UserSettingsEntity>}
   */
  async get(userId) {
    return this.userSettingsModel.get(userId);
  }

  /**
   * Create or update user settings.
   * @param {string} userId User ID.
   * @param {object} data User settings JSON data.
   * @returns {Promise<UserSettingsEntity>}
   */
  async createOrUpdate(userId, data) {
    return this.userSettingsModel.createOrUpdate(userId, data);
  }
}

module.exports = UserSettingsBusiness;
