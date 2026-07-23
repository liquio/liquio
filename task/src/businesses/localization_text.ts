import LocalizationTextModel from '../models/localization_text';

/**
 * Localization text business.
 */
export class LocalizationTextBusiness {
  private static singleton: LocalizationTextBusiness;

  config: any;
  localizationTextModel: any;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor (config) {
    // Define singleton.
    if (!LocalizationTextBusiness.singleton) {
      this.config = config;
      this.localizationTextModel = new LocalizationTextModel();
      LocalizationTextBusiness.singleton = this;
    }

    // Return singleton.
    return LocalizationTextBusiness.singleton;
  }

  /**
   * Get all localization texts.
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async getAll (params) {
    return await this.localizationTextModel.getAll(params);
  }
}

