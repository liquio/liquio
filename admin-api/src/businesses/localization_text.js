const LocalizationTextModel = require('../models/localization_text');

/**
 * Localization text business.
 */
class LocalizationTextBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
   * Get all localization texts with pagination.
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async getListWithPagination(params) {
    return await this.localizationTextModel.getListWithPagination(params);
  }

  /**
   * Get all localization texts grouped by keys with pagination.
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async getListByKeysWithPagination(params) {
    return await this.localizationTextModel.getListByKeysWithPagination(params);
  }

  /**
   * Create localization text.
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async createLocalizationText(params) {
    return await this.localizationTextModel.createLocalizationText(params);
  }

  /**
   * Update localization text.
   * @returns {Promise<LocalizationTextEntity[]>}
   */
  async updateLocalizationText(params) {
    return await this.localizationTextModel.updateLocalizationText(params);
  }

  /**
   * Delete localization text.
   * @returns {Promise<number>}
   */
  async deleteLocalizationText(params) {
    return await this.localizationTextModel.deleteLocalizationText(params);
  }

  /**
   * Export.
   * @param {object[]} codesKeysList CodesKeysList. [{localizationLanguageCode: 'eng', key: 'Будинок'}, ...]
   * @returns {Promise<string>}
   */
  async export(codesKeysList) {
    return this.localizationTextModel.getListByCodeAndKey(codesKeysList);
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
      for (const text of data) {
        const { localizationLanguageCode, key } = text;
        const [exisitingLocalizationText] = await this.localizationTextModel.getListByCodeAndKey([{ localizationLanguageCode, key }]);
        if (exisitingLocalizationText && force === false) {
          throw new Error('Localization text already exists.');
        }
        if (exisitingLocalizationText) {
          await this.localizationTextModel.updateLocalizationText(text, { transaction });
        } else {
          await this.localizationTextModel.createLocalizationText(text, { transaction });
        }
      }

      await transaction.commit();
      log.save('user-imported-localization-texts', { user: person, data });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return true;
  }
}

module.exports = LocalizationTextBusiness;
