// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

/**
 * Provider.
 */
class Provider {
  /**
   * Get provider name.
   * @returns {string}
   */
  static get name() {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get file info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async getFileInfo(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Delete file.
   * @param {string} fileId File ID.
   * @returns {Promise<{deletedRowsCount: number}>} Promise of file info.
   */
  async deleteFile(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFileRequestOptions(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file.
   */
  async downloadFile(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file preview request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFilePreviewRequestOptions(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file preview.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file preview.
   */
  async downloadFilePreview(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Upload file request options.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async uploadFileRequestOptions(name, description, contentType, contentLength) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Upload file.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @returns {Promise<WritableStream>} Promise of writable stream to upload file.
   */
  async uploadFile(name, description, contentType, contentLength) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Upload file from stream.
   * @param {ReadableStream} readableStream Readable stream to upload file.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async uploadFileFromStream(readableStream, name, description, contentType, contentLength) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}[]>} Promise of signatures list.
   */
  async getSignatures(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Add signature.
   * @param {string} fileId File ID.
   * @param {string} signedData Signed data.
   * @param {string} signature Signature.
   * @param {string} certificate Certificate.
   * @param {object} meta Meta info.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of signature.
   */
  async addSignature(fileId, signedData, signature, certificate, meta) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get P7S signature request options.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async getP7sSignatureRequestOptions(fileId, asFile) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get P7S signature info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7SSignatureInfo(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @returns {Promise<{id, fileId, p7s, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7sSignature(fileId, asFile) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Add P7S signature.
   * @param {string} fileId File ID.
   * @param {string} p7s P7S base64 string.
   */
  async addP7sSignature(fileId, p7s) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update P7S signature.
   * @param {string} id P7S signature ID.
   * @param {string} p7s P7S base64 string.
   */
  async updateP7sSignature(id, p7s) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Remove P7S signature.
   * @param {string} id P7S signature ID.
   */
  async removeP7sSignature(id) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Copy file.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async copyFile(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create ASIC manifest.
   * @param {string[]} filesIds Files IDs.
   * @param {object} [dataObject] Data object.
   * @returns {object} Manifest file info.
   */
  async createAsicManifest(filesIds = [], dataObject = null) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create ASIC request options.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async createAsicRequestOptions(manifestFileId, filesIds) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create ASIC.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ASIC.
   */
  async createAsic(manifestFileId, filesIds) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Generate file name.
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns {string} File name.
   */
  generateFileName(extension) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Generate file name for user.
   * @param {string} userId User ID.
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns {string} File name for user.
   */
  generateFileNameForUser(userId, extension) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get p7s metadata by files Ids.
   * @param {number[]} fileIds File ids.
   */
  getP7sMetadata(fileIds) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file ASiC-S request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers, body}>} Promise of request options.
   */
  async downloadFileAsicsRequestOptions(fileId) { // eslint-disable-line no-unused-vars
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = Provider;
