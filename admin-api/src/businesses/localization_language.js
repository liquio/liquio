const LocalizationLanguageModel = require('../models/localization_language');

/**
 * Localization language business.
 */
class LocalizationLanguageBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
   * Get all localization languages with pagination.
   * @returns {Promise<LocalizationLanguageEntity[]>}
   */
  async getListWithPagination(params) {
    return await this.localizationLanguageModel.getListWithPagination(params);
  }

  /**
   * Create localization language.
   * @returns {Promise<LocalizationLanguageEntity[]>}
   */
  async createLocalizationLanguage(params, options) {
    return await this.localizationLanguageModel.createLocalizationLanguage(params, options);
  }

  /**
   * Update localization language.
   * @returns {Promise<LocalizationLanguageEntity[]>}
   */
  async updateLocalizationLanguage(params, options) {
    return await this.localizationLanguageModel.updateLocalizationLanguage(params, options);
  }

  /**
   * Delete localization language.
   * @returns {Promise<number>}
   */
  async deleteLocalizationLanguage(params) {
    return await this.localizationLanguageModel.deleteLocalizationLanguage(params);
  }

  /**
   * Export.
   * @param {string[]} codes Codes.
   * @returns {Promise<string>}
   */
  async export(codes) {
    return this.localizationLanguageModel.getListByCodes(codes);
  }

  /**
   * Import.
   * @param {string} dataRaw Raw (string) data.
   * @param {object} params params.
   * @param {boolean} params.force Force.
   * @param {object} params.person Person.
   * @returns {Promise<boolean>}
   */
  async import(dataRaw, { force = false, person } = {}) {
    const data = JSON.parse(dataRaw);

    const transaction = await db.transaction();

    try {
      for (const lang of data) {
        const [exisitingLocalizationLanguage] = await this.localizationLanguageModel.getListByCodes([lang.code]);
        if (exisitingLocalizationLanguage && force === false) {
          throw new Error('Localization language already exists.');
        }
        if (exisitingLocalizationLanguage) {
          await this.localizationLanguageModel.updateLocalizationLanguage(lang, { person, transaction });
        } else {
          await this.localizationLanguageModel.createLocalizationLanguage(lang, { person, transaction });
        }
      }

      await transaction.commit();
      log.save('user-imported-localization-languages', { user: person, data });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return true;
  }
}

module.exports = LocalizationLanguageBusiness;
