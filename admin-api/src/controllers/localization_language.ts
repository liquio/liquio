const { matchedData } = require('express-validator');

const Stream = require('../lib/stream');
const Controller = require('./controller');
const LocalizationLanguageBussiness = require('../businesses/localization_language');

/**
 * Localization language controller.
 */
class LocalizationLanguageController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!LocalizationLanguageController.singleton) {
      super(config);

      this.localizationLanguageBussiness = new LocalizationLanguageBussiness(config);
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
      localizationLanguages = await this.localizationLanguageBussiness.getListWithPagination({
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

      createdLocalizationLanguage = await this.localizationLanguageBussiness.createLocalizationLanguage(
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
      log.save('localization-language-create-error|cannot-create-language', {
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

      updatedLocalizationLanguage = await this.localizationLanguageBussiness.updateLocalizationLanguage(
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
      deleteResult = await this.localizationLanguageBussiness.deleteLocalizationLanguage({ code });
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
      exportedLocalizationLanguages = await this.localizationLanguageBussiness.export(codes);
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
      await this.localizationLanguageBussiness.import(data, { force, person });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }
}

module.exports = LocalizationLanguageController;
