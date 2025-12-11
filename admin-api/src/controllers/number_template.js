const { matchedData } = require('express-validator');

const Controller = require('./controller');
const Stream = require('../lib/stream');
const NumberTemplateBusiness = require('../businesses/number_template');
const NumberTemplateEntity = require('../entities/number_template');

/**
 * Number template controller.
 */
class NumberTemplateController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!NumberTemplateController.singleton) {
      super(config);
      this.numberTemplateBusiness = new NumberTemplateBusiness();
      NumberTemplateController.singleton = this;
    }
    return NumberTemplateController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let savedNumberTemplateEntity;
    try {
      const bodyData = matchedData(req, { locations: ['body'] });

      const numberTemplateEntity = new NumberTemplateEntity(bodyData);

      savedNumberTemplateEntity = await this.numberTemplateBusiness.createOrUpdate(numberTemplateEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-created-number-template', { user, data: savedNumberTemplateEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedNumberTemplateEntity);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    let savedNumberTemplateEntity;
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const bodyData = matchedData(req, { locations: ['body'] });

      const numberTemplateEntity = new NumberTemplateEntity({
        id,
        ...bodyData,
      });

      savedNumberTemplateEntity = await this.numberTemplateBusiness.createOrUpdate(numberTemplateEntity);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-updated-number-template', { user, data: savedNumberTemplateEntity });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, savedNumberTemplateEntity);
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};

    const { page, count } = queryData;

    let numberTemplates;
    try {
      numberTemplates = await this.numberTemplateBusiness.getNumberTemplates({
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, numberTemplates, true);
  }

  /**
   * Delete by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;

    try {
      await this.numberTemplateBusiness.deleteById(id);

      const user = this.getRequestUserBaseInfo(req);
      await log.save('user-deleted-number-template', { user, data: { id } });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let numberTemplate;

    try {
      numberTemplate = await this.numberTemplateBusiness.findById(id);
      if (!numberTemplate) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, numberTemplate);
  }

  /**
   * Export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async export(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let numberTemplate;

    try {
      numberTemplate = await this.numberTemplateBusiness.export(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, numberTemplate, 'application/bpmn', 'number_template.bpmn');
  }

  /**
   * Import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async import(req, res) {
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
      await this.numberTemplateBusiness.import(data, { user });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }
}

module.exports = NumberTemplateController;
