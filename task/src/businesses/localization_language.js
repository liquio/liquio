const LocalizationLanguageModel = require('../models/localization_language');

/**
 * Localization language business.
 */
class LocalizationLanguageBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor (config) {
    // Define singleton.
    if (!LocalizationLanguageBusiness.singleton) {
      this.config = config;
      this.localizationLanguageModel = new LocalizationLanguageModel();
      LocalizationLanguageBusiness.singleton = this;
    }

    // Return singleton.
    return LocalizationLanguageBusiness.singleton;
  }

  /**
   * Get all localization languages.
   * @returns {Promise<LocalizationLanguageEntity[]>}
   */
  async getAll (params) {
    return await this.localizationLanguageModel.getAll(params);
  }
}

module.exports = LocalizationLanguageBusiness;
