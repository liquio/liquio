const axios = require('axios');
const PropByPath = require('prop-by-path');
const { matchedData } = require('express-validator');

const Controller = require('./controller');
const RegisterBusiness = require('../businesses/register');
const DocumentAttachmentModel = require('../models/document_attachment');
const StorageService = require('../services/storage');
const { InvalidParamsError, ForbiddenError } = require('../lib/errors');

/**
 * Protected file controller.
 */
class ProtectedFileController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    if (!ProtectedFileController.singleton) {
      super(config);
      this.registerBusiness = new RegisterBusiness(config);
      this.storageService = new StorageService();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      ProtectedFileController.singleton = this;
    }
    return ProtectedFileController.singleton;
  }

  /**
   * Open protected file.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async open(req, res) {
    try {
      const {
        key_id: keyId,
        record_id: recordId
      } = matchedData(req, { locations: ['params'] });
      const { preview, path, p7s } = matchedData(req, { locations: ['query'] });

      const userUnitIds = this.getRequestUserUnitIds(req);
      const accessInfo = this.getRequestAccessInfo(req);
      const allowTokens = this.getRequestUserUnitAllowTokens(req);

      if (!keyId || !recordId || !path) {
        log.save('protected-file-controller|invalid-parameters-error', { keyId, recordId, path });
        throw new InvalidParamsError('Missing required parameters: key_id, record_id, path.');
      }

      const record = await this.registerBusiness.findRecordAndCheckAccess(
        recordId,
        keyId,
        allowTokens,
        userUnitIds,
        accessInfo
      );

      const attach = PropByPath.get(record || {}, path);
      const fileId = attach?.link;
      if (!fileId) {
        log.save('protected-file-controller|file-id-not-found', { path });
        throw new ForbiddenError('You are not allowed to access this file.');
      }

      const requestOptions = await this.getDownloadOptions(fileId, preview, p7s);
      const stream = await axios({ ...requestOptions, responseType: 'stream' });
      stream.data.pipe(res);
    } catch (error) {
      log.save('protected-file-controller|open-error', error && error.message);
      return this.responseError(res, error);
    }
  }

  /**
   * Upload protected file.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async uploadProtectedFile(req, res) {
    const normalizeFileName = (fileName) => `${fileName}`.replace(/[?/\\:"']/g, '_');

    const originalFileName = normalizeFileName(req.query.file_name);
    const contentType = req.query.content_type || req.headers['content-type'];
    const contentLength = req.query.content_length || req.headers['content-length'];

    try {
      const { id: fileId } = await this.storageService.provider.uploadFileFromStream(
        req,
        originalFileName,
        undefined,
        contentType,
        contentLength
      );

      this.responseData(res, {
        link: fileId,
        name: originalFileName,
        type: contentType,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Get download file options.
   * @private
   * @param {string} fileId File ID.
   * @param {boolean} preview Preview.
   * @param {boolean} p7s P7s.
   * @returns {object} Download options.
   */
  async getDownloadOptions(fileId, preview, p7s) {
    if (preview) {
      return this.storageService.provider.downloadFilePreviewRequestOptions(fileId);
    }

    if (p7s) {
      return this.storageService.provider.getP7sSignatureRequestOptions(fileId, true);
    }

    return this.storageService.provider.downloadFileRequestOptions(fileId);
  }
}

module.exports = ProtectedFileController;
