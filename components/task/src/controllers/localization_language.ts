
import { matchedData } from 'express-validator';
import { Controller } from './controller';
import { LocalizationLanguageBusiness as LocalizationLanguageBussiness } from '../businesses/localization_language';

/**
 * Localization language controller.
 */
export class LocalizationLanguageController extends Controller {
  private static singleton: LocalizationLanguageController;

  localizationLanguageBussiness: any;

  constructor() {
    // Define singleton.
    if (!LocalizationLanguageController.singleton) {
      super();

      this.localizationLanguageBussiness = new LocalizationLanguageBussiness({});
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

