
const { matchedData } = require('express-validator');
const Controller = require('./controller');
const LocalizationLanguageBussiness = require('../businesses/localization_language');

/**
 * Localization language controller.
 */
class LocalizationLanguageController extends Controller {
  constructor() {
    // Define singleton.
    if (!LocalizationLanguageController.singleton) {
      super();

      this.localizationLanguageBussiness = new LocalizationLanguageBussiness();
      LocalizationLanguageController.singleton = this;
    }
    return LocalizationLanguageController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const { filters = {} } = matchedData(req, { locations: ['query'] });

    let localizationLanguages;
    try {
      localizationLanguages = await this.localizationLanguageBussiness.getAll({ filters });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, localizationLanguages, true);
  }
}

module.exports = LocalizationLanguageController;
