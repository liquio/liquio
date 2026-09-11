import { matchedData } from 'express-validator';

import { Stream } from '../lib/stream';
import { Controller } from './controller';
import { LocalizationLanguageBusiness } from '../businesses/localization_language';

/**
 * Localization language controller.
 */
export class LocalizationLanguageController extends Controller {
  private static singleton: LocalizationLanguageController;

  private localizationLanguageBusiness: LocalizationLanguageBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!LocalizationLanguageController.singleton) {
      super(config);

      this.localizationLanguageBusiness = new LocalizationLanguageBusiness(config);
      LocalizationLanguageController.singleton = this;
    }
    return LocalizationLanguageController.singleton;
  }

  /**
   * Get list with pagination.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getListWithPagination(req, res) {
    const { sort = {}, filters = {}, page, count } = matchedData(req, { locations: ['query'] });

    let localizationLanguages;
    try {
      localizationLanguages = await this.localizationLanguageBusiness.getListWithPagination({
        sort,
        filters,
        currentPage: page,
        perPage: count,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, localizationLanguages, true);
  }

  /**
   * Create localization language.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    const { code, name, isActive = true } = matchedData(req, { locations: ['body'] });

    let createdLocalizationLanguage;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const person = {
        userId: user.userId,
        name: user.name,
      };

      createdLocalizationLanguage = await this.localizationLanguageBusiness.createLocalizationLanguage(
        {
          code,
          name,
          isActive,
        },
        {
          person,
        },
      );
    } catch (error) {
      await global.log.save('localization-language-create-error|cannot-create-language', {
        error: error.message,
        cause: error.cause,
        fieds: error.fieds,
        code,
        name,
      });
      return this.responseError(res, error);
    }

    this.responseData(res, createdLocalizationLanguage);
  }

  /**
   * Update localization language.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    const { code } = matchedData(req, { locations: ['params'] });
    const { name, isActive } = matchedData(req, { locations: ['body'] });

    let updatedLocalizationLanguage;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const person = {
        userId: user.userId,
        name: user.name,
      };

      updatedLocalizationLanguage = await this.localizationLanguageBusiness.updateLocalizationLanguage(
        {
          code,
          name,
          isActive,
        },
        {
          person,
        },
      );
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, updatedLocalizationLanguage);
  }

  /**
   * Delete localization language.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const { code } = matchedData(req, { locations: ['params'] });

    let deleteResult;
    try {
      deleteResult = await this.localizationLanguageBusiness.deleteLocalizationLanguage({ code });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, deleteResult);
  }

  /**
   * Export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async export(req, res) {
    const { codes = [] } = matchedData(req, { locations: ['body'] });

    let exportedLocalizationLanguages;
    try {
      exportedLocalizationLanguages = await this.localizationLanguageBusiness.export(codes);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, exportedLocalizationLanguages, 'application/bpmn', 'localization_languages.bpmn');
  }

  /**
   * Import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async import(req, res) {
    const { force = false } = matchedData(req, { locations: ['query'] });

    try {
      let fileContentBuffer;
      let chunks = [];
      req.on('data', (data) => chunks.push(data));
      req.on('end', () => {
        fileContentBuffer = Buffer.concat(chunks);
      });
      await Stream.waitEndEvent(req);

      let data = fileContentBuffer.toString();

      const user = this.getRequestUserBaseInfo(req);
      const person = {
        userId: user.userId,
        name: user.name,
      };
      await this.localizationLanguageBusiness.import(data, { force, person } as any);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }
}
