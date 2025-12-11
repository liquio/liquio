
const Controller = require('./controller');
const DocumentTemplateModel = require('../models/document_template');
const redisClient = require('../lib/redis_client');
const { ERROR_DOCUMENT_TEMPLATE_NOT_FOUND } = require('../constants/error');
const { NotFoundError } = require('../lib/errors');

/**
 * Document template controller.
 */
class DocumentTemplateController extends Controller {
  /**
   * Document template controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!DocumentTemplateController.singleton) {
      super(config);
      this.documentTemplateModel = new DocumentTemplateModel();
      DocumentTemplateController.singleton = this;
    }
    return DocumentTemplateController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Get document templates.
    let documentTemplates;
    try {
      const { data: cachedDocumentTemplates } = await redisClient.getOrSet(
        'task.documentTemplate.getAll',
        async () => {
          documentTemplates = await this.documentTemplateModel.getAll();
          documentTemplates = this.filterResponse(documentTemplates, true);
          return documentTemplates;
        },
      );
      documentTemplates = cachedDocumentTemplates;
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, documentTemplates);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const documentTemplateId = parseInt(req.params.id);

    // Prepare response data.
    let documentTemplate;
    try {
      documentTemplate = await this.documentTemplateModel.findById(documentTemplateId);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!documentTemplate) {
      return this.responseError(res, new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND));
    }

    this.responseData(res, documentTemplate);
  }
}

module.exports = DocumentTemplateController;
