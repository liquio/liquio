const { matchedData } = require('express-validator');

const Stream = require('../lib/stream');
const Controller = require('./controller');
const LocalizationTextBussiness = require('../businesses/localization_text');

/**
 * Localization text controller.
 */
class LocalizationTextController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!LocalizationTextController.singleton) {
      super(config);

      this.localizationTextBussiness = new LocalizationTextBussiness(config);
      LocalizationTextController.singleton = this;
    }
    return LocalizationTextController.singleton;
  }

  /**
   * Get list with pagination.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getListWithPagination(req, res) {
    const { sort = {}, filters = {}, page, count } = matchedData(req, { locations: ['query'] });

    let textTexts;
    try {
      textTexts = await this.localizationTextBussiness.getListWithPagination({
        sort,
        filters,
        currentPage: page,
        perPage: count,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, textTexts, true);
  }

  /**
   * Get list grouped by keys with pagination.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getListByKeysWithPagination(req, res) {
    const { sort = {}, filters = {}, page, count } = matchedData(req, { locations: ['query'] });

    let texts;
    try {
      texts = await this.localizationTextBussiness.getListByKeysWithPagination({
        sort,
        filters,
        currentPage: page,
        perPage: count,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, texts, true);
  }

  /**
   * Create localization text.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    const { localizationLanguageCode, key, value } = matchedData(req, { locations: ['body'] });
    if (!localizationLanguageCode || !key || !value) {
      return this.responseError(res, 'Params localizationLanguageCode, key and value are required.');
    }

    let createdLocalizationText;
    try {
      createdLocalizationText = await this.localizationTextBussiness.createLocalizationText({
        localizationLanguageCode,
        key,
        value,
      });
    } catch (error) {
      log.save('localization-text-create-error|cannot-create-text', {
        error: error.message,
        cause: error.cause,
        fieds: error.fieds,
        localizationLanguageCode,
        key,
        value,
      });
      return this.responseError(res, error);
    }

    this.responseData(res, createdLocalizationText);
  }

  /**
   * Update localization text.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    const { localization_language_code: localizationLanguageCode, key } = matchedData(req, { locations: ['params'] });
    const { value } = matchedData(req, { locations: ['body'] });

    if (!localizationLanguageCode || !key || !value) {
      return this.responseError(res, 'Params localization_language_code, key and value are required.');
    }

    let updatedLocalizationText;
    try {
      updatedLocalizationText = await this.localizationTextBussiness.updateLocalizationText({
        localizationLanguageCode,
        key,
        value,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, updatedLocalizationText);
  }

  /**
   * Delete text language.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const { localization_language_code: localizationLanguageCode, key } = matchedData(req, { locations: ['params'] });
    if (!localizationLanguageCode || !key) {
      return this.responseError(res, 'Params localization_language_code and key are required.');
    }

    let deleteResult;
    try {
      deleteResult = await this.localizationTextBussiness.deleteLocalizationText({ localizationLanguageCode, key });
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
    const { texts = [] } = matchedData(req, { locations: ['body'] });

    // All texts have to contain localizationLanguageCode and key property.
    if (texts.length && !texts.every((t) => t.localizationLanguageCode && t.key)) {
      return this.responseError(res, 'Invalid texts body param.', 422);
    }

    // Remove redundant properties except localizationLanguageCode and key.
    const codesKeysList = texts.map(({ localizationLanguageCode, key }) => ({ localizationLanguageCode, key }));

    let exportedLocalizationTexts;
    try {
      exportedLocalizationTexts = await this.localizationTextBussiness.export(codesKeysList);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, exportedLocalizationTexts, 'application/bpmn', 'localization_texts.bpmn');
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
      await this.localizationTextBussiness.import(data, { force, person });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }
}

module.exports = LocalizationTextController;
