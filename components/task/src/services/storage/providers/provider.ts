// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

/**
 * Provider.
 */
export class Provider {
  /**
   * Get provider name.
   * @returns {string}
   */
  // @ts-expect-error Intentional override of Function.name to identify this provider.
  static get name(): string {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get file info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async getFileInfo(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Delete file.
   * @param {string} fileId File ID.
   * @returns {Promise<{deletedRowsCount: number}>} Promise of file info.
   */
  async deleteFile(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFileRequestOptions(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file.
   */
  async downloadFile(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file preview request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFilePreviewRequestOptions(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file preview.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file preview.
   */
  async downloadFilePreview(_fileId) {
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
  async uploadFileRequestOptions(_name, _description, _contentType, _contentLength) {
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
  async uploadFile(_name, _description, _contentType, _contentLength) {
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
  async uploadFileFromStream(_readableStream, _name, _description, _contentType, _contentLength) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}[]>} Promise of signatures list.
   */
  async getSignatures(_fileId) {
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
  async addSignature(_fileId, _signedData, _signature, _certificate, _meta) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get P7S signature request options.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async getP7sSignatureRequestOptions(_fileId, _asFile) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get P7S signature info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7SSignatureInfo(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @returns {Promise<{id, fileId, p7s, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7sSignature(_fileId, _asFile, ..._rest: any[]) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Add P7S signature.
   * @param {string} fileId File ID.
   * @param {string} p7s P7S base64 string.
   */
  async addP7sSignature(_fileId, _p7s, ..._rest: any[]) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Update P7S signature.
   * @param {string} id P7S signature ID.
   * @param {string} p7s P7S base64 string.
   */
  async updateP7sSignature(_id, _p7s) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Remove P7S signature.
   * @param {string} id P7S signature ID.
   */
  async removeP7sSignature(_id) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Copy file.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async copyFile(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create ASIC manifest.
   * @param {string[]} filesIds Files IDs.
   * @param {object} [dataObject] Data object.
   * @returns {object} Manifest file info.
   */
  async createAsicManifest(_filesIds = [], _dataObject = null) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create ASIC request options.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async createAsicRequestOptions(_manifestFileId, _filesIds) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Create ASIC.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ASIC.
   */
  async createAsic(_manifestFileId, _filesIds) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Generate file name.
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns {string} File name.
   */
  generateFileName(_extension) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Generate file name for user.
   * @param {string} userId User ID.
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns {string} File name for user.
   */
  generateFileNameForUser(_userId, _extension) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get p7s metadata by files Ids.
   * @param {number[]} fileIds File ids.
   */
  getP7sMetadata(_fileIds) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Download file ASiC-S request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers, body}>} Promise of request options.
   */
  async downloadFileAsicsRequestOptions(_fileId) {
    throw new Error(ERROR_OVERRIDE);
  }
}

