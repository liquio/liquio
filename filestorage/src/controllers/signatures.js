const Controller = require('./controller');
const SignatureModel = require('../models/signature');

/**
 * Signatures controller.
 */
class SignaturesController extends Controller {
  /**
   * Signatures controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!SignaturesController.singleton) {
      super(config);
      this.signatureModel = new SignatureModel();
      SignaturesController.singleton = this;
    }
    return SignaturesController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Define params.
    const { offset, limit, file_id } = { offset: 0, limit: 20, ...req.query };
    let filter = {};
    if (file_id) {
      filter.file_id = file_id;
    }

    // Get signatures.
    let signaturesModelResponse;
    try {
      signaturesModelResponse = await this.signatureModel.getAll({
        offset: parseInt(offset),
        limit: Math.min(parseInt(limit), this.config.pagination.maxLimit),
        filter,
      });
    } catch (error) {
      log.save('get-signatures-error', { error: error && error.message });
    }
    const { data: signatures, meta } = signaturesModelResponse || {};

    // Response.
    this.responseData(res, signatures, meta);
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
    let signatureModelResponse;
    try {
      signatureModelResponse = await this.signatureModel.findById(id);
    } catch (error) {
      log.save('get-signature-by-id-error', { error: error && error.message });
    }
    const { data: signature } = signatureModelResponse || {};

    // Check.
    if (!signature) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseData(res, signature);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    // Define params.
    const { fileId, signedData, signature, certificate, meta } = req.body;
    const { user } = req.auth;

    // Get signatures.
    let signatureModelResponse;
    try {
      signatureModelResponse = await this.signatureModel.create({ fileId, signedData, signature, certificate, meta, user });
    } catch (error) {
      log.save('create-signature-error', { error: error && error.message });
    }
    const { data: createdSignature } = signatureModelResponse || {};

    // Check.
    if (!createdSignature) {
      return this.responseError(res, 'Can not create.', 500);
    }

    // Response.
    this.responseData(res, createdSignature);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    // Define params.
    const { id } = req.params;
    const { fileId, signedData, signature, certificate, meta } = req.body;
    const { user } = req.auth;

    // Get signatures.
    let signatureModelResponse;
    try {
      signatureModelResponse = await this.signatureModel.update(id, { fileId, signedData, signature, certificate, meta, user });
    } catch (error) {
      log.save('update-signature-error', { error: error && error.message });
    }
    const { data: updatedSignature } = signatureModelResponse || {};

    // Check.
    if (!updatedSignature) {
      return this.responseError(res, 'Can not update.', 500);
    }

    // Response.
    this.responseData(res, updatedSignature);
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
      deletedRowsCountModelResponse = await this.signatureModel.delete(id);
    } catch (error) {
      log.save('delete-signature-error', { error: error && error.message });
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
      deletedRowsCountModelResponse = await this.signatureModel.deleteByFileId(fileId);
    } catch (error) {
      log.save('delete-signature-by-file-id-error', { error: error && error.message });
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
module.exports = SignaturesController;
