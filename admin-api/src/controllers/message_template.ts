const { matchedData } = require('express-validator');

const Controller = require('./controller');
const NotifierService = require('../services/notifier');
const Stream = require('../lib/stream');

/**
 * Event controller.
 */
class MessageTemplateController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!MessageTemplateController.singleton) {
      super(config);

      this.notifierService = new NotifierService(config.notifier);
      MessageTemplateController.singleton = this;
    }
    return MessageTemplateController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    let messageTemplates;
    try {
      messageTemplates = await this.notifierService.getMessageTemplates();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, messageTemplates);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    let newMessageTemplate;
    try {
      const dto = matchedData(req, { locations: ['body'] });
      newMessageTemplate = await this.notifierService.createMessageTemplate(dto);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseData(res, newMessageTemplate);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    let updatedMessageTemplate;
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const dto = matchedData(req, { locations: ['body'] });
      updatedMessageTemplate = await this.notifierService.updateMessageTemplate(id, dto);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseData(res, updatedMessageTemplate?.[1]?.[0]);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      await this.notifierService.deleteMessageTemplate(id);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }
    this.responseData(res);
  }

  /**
   * Export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async export(req, res) {
    const { template_ids } = matchedData(req, { locations: ['query'] });
    let messageTemplates;
    try {
      messageTemplates = await this.notifierService.getMessageTemplates({ template_ids });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, messageTemplates, 'text/plain', 'message-templates.dat');
  }

  /**
   * Import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async import(req, res) {
    let { rewriteTemplateIds = [] } = matchedData(req, { locations: ['query'] });
    rewriteTemplateIds = rewriteTemplateIds.map((el) => Number(el));

    try {
      let fileContentBuffer;
      let chunks = [];
      req.on('data', (data) => chunks.push(data));
      req.on('end', () => {
        fileContentBuffer = Buffer.concat(chunks);
      });
      await Stream.waitEndEvent(req);

      const fileContentBufferString = fileContentBuffer.toString('utf-8');
      const dataToImport = JSON.parse(fileContentBufferString);

      let importResult;
      try {
        importResult = await this.notifierService.importMessageTemplates({ dataToImport, rewriteTemplateIds });
      } catch (error) {
        return this.responseError(res, error);
      }

      return this.responseData(res, importResult);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }
  }
}

module.exports = MessageTemplateController;
