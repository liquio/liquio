
import { matchedData } from 'express-validator';
import { Controller } from './controller';
import { LocalizationTextBusiness as LocalizationTextBussiness } from '../businesses/localization_text';

/**
 * Localization text controller.
 */
export class LocalizationTextController extends Controller {
  private static singleton: LocalizationTextController;

  localizationTextBussiness: any;

  constructor() {
    // Define singleton.
    if (!LocalizationTextController.singleton) {
      super();

      this.localizationTextBussiness = new LocalizationTextBussiness({});
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

