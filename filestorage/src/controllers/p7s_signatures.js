const Controller = require('./controller');
const P7sSignatureModel = require('../models/p7s_signature');

/**
 * P7S signatures controller.
 */
class P7sSignaturesController extends Controller {
  /**
   * P7S signatures controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!P7sSignaturesController.singleton) {
      super(config);
      this.p7sSignatureModel = new P7sSignatureModel();
      P7sSignaturesController.singleton = this;
    }
    return P7sSignaturesController.singleton;
  }

  /**
   * Find info by file ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findInfoByFileId(req, res) {
    // Metrics timer.
    const timer = new Date();

    // Define params.
    const { fileId } = req.params;

    // Get file.
    let p7sSignatureModelResponse;
    try {
      p7sSignatureModelResponse = await this.p7sSignatureModel.findInfoByFileId(fileId);
    } catch (error) {
      log.save('get-p7s-signature-main-info-by-id-error', { error: error && error.message });
    }
    const { data: p7sSignature } = p7sSignatureModelResponse || {};

    // Check.
    if (!p7sSignature) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Save metrics.
    this.controllerMetric('findInfoById', timer);

    // Response.
    this.responseData(res, p7sSignature);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const { id } = req.params;

    // Get signature.
    let p7sSignatureModelResponse;
    try {
      p7sSignatureModelResponse = await this.p7sSignatureModel.findById(id);
    } catch (error) {
      log.save('get-signature-by-id-error', { error: error && error.message });
    }
    const { data: p7sSignature } = p7sSignatureModelResponse || {};

    // Check.
    if (!p7sSignature) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseData(res, p7sSignature);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    // Define params.
    const { fileId, p7s, meta } = req.body;
    const { user } = req.auth;

    // Get signatures.
    let p7sSignatureModelResponse;
    try {
      p7sSignatureModelResponse = await this.p7sSignatureModel.createOrUpdate({ fileId, p7s, meta, user });
    } catch (error) {
      log.save('create-p7s-signature-error', { error: error && error.message });
    }
    const { data: createdP7sSignature } = p7sSignatureModelResponse || {};

    // Check.
    if (!createdP7sSignature) {
      return this.responseError(res, 'Can not create.', 500);
    }

    // Response.
    this.responseData(res, createdP7sSignature);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    // Define params.
    const { id } = req.params;
    const { p7s, meta } = req.body;
    const { user } = req.auth;

    // Get signatures.
    let p7sSignatureModelResponse;
    try {
      p7sSignatureModelResponse = await this.p7sSignatureModel.update(id, { p7s, meta, user });
    } catch (error) {
      log.save('update-p7s-signature-error', { error: error && error.message });
    }
    const { data: updatedP7sSignature } = p7sSignatureModelResponse || {};

    // Check.
    if (!updatedP7sSignature) {
      return this.responseError(res, 'Can not update.', 500);
    }

    // Response.
    this.responseData(res, updatedP7sSignature);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    // Define params.
    const { id } = req.params;

    // Delete signature.
    let deletedRowsCountModelResponse;
    try {
      deletedRowsCountModelResponse = await this.p7sSignatureModel.delete(id);
    } catch (error) {
      log.save('delete-p7s-signature-error', { error: error && error.message });
    }
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};

    // Check.
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Can not delete.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }

  /**
   * Delete by file ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteByFileId(req, res) {
    // Define params.
    const { fileId } = req.params;

    // Delete signature.
    let deletedRowsCountModelResponse;
    try {
      deletedRowsCountModelResponse = await this.p7sSignatureModel.deleteByFileId(fileId);
    } catch (error) {
      log.save('delete-p7s-signature-by-file-id-error', { error: error && error.message });
    }
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};

    // Check.
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Can not delete.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }
}

// Export.
module.exports = P7sSignaturesController;
