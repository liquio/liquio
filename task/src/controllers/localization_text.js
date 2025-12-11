
const { matchedData } = require('express-validator');
const Controller = require('./controller');
const LocalizationTextBussiness = require('../businesses/localization_text');

/**
 * Localization text controller.
 */
class LocalizationTextController extends Controller {
  constructor() {
    // Define singleton.
    if (!LocalizationTextController.singleton) {
      super();

      this.localizationTextBussiness = new LocalizationTextBussiness();
      LocalizationTextController.singleton = this;
    }
    return LocalizationTextController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const { filters = {} } = matchedData(req, { locations: ['query'] });

    let localizationTexts;
    try {
      localizationTexts = await this.localizationTextBussiness.getAll({ filters });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, localizationTexts, true);
  }
}

module.exports = LocalizationTextController;
