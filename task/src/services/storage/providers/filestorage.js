
const Provider = require('./provider');
const FileStorage = require('../../../lib/filestorage');

/**
 * File storage provider.
 */
class FileStorageProvider extends Provider {
  /**
   * Constructor.
   * @param {object} config FileStorage config.
   */
  constructor(config) {
    if (!FileStorageProvider.singleton) {
      super();
      this.fileStorage = new FileStorage(config);
      FileStorageProvider.singleton = this;
    }

    return FileStorageProvider.singleton;
  }

  /**
   * Get provider name.
   * @returns {string}
   */
  static get name() {
    return 'FileStorage';
  }

  /**
   * Get file info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async getFileInfo(fileId) {
    return await this.fileStorage.getFileInfo(fileId);
  }

  /**
   * Delete file.
   * @param {string} fileId File ID.
   * @returns {Promise<{deletedRowsCount: number}>} Promise of file info.
   */
  async deleteFile(fileId) {
    return await this.fileStorage.deleteFile(fileId);
  }

  /**
   * Download file request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFileRequestOptions(fileId) {
    return await this.fileStorage.downloadFileRequestOptions(fileId);
  }

  /**
   * Download file.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file.
   */
  async downloadFile(fileId) {
    return await this.fileStorage.downloadFile(fileId);
  }

  /**
   * Download file preview request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFilePreviewRequestOptions(fileId) {
    return await this.fileStorage.downloadFilePreviewRequestOptions(fileId);
  }

  /**
   * Download file preview.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file.
   */
  async downloadFilePreview(fileId) {
    return await this.fileStorage.downloadFilePreview(fileId);
  }

  /**
   * Download ZIP request options.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of request options.
   */
  async downloadZipRequestOptions(filesIds) {
    return await this.fileStorage.downloadZipRequestOptions(filesIds);
  }

  /**
   * Download ZIP.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ZIP.
   */
  async downloadZip(filesIds) {
    return await this.fileStorage.downloadZip(filesIds);
  }

  /**
   * Upload file request options.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async uploadFileRequestOptions(name, description, contentType, contentLength) {
    return await this.fileStorage.uploadFileRequestOptions(name, description, contentType, contentLength);
  }

  /**
   * Upload file.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @returns {Promise<WritableStream>} Promise of writable stream to upload file.
   */
  async uploadFile(name, description, contentType, contentLength) {
    return await this.fileStorage.uploadFileRequestOptions(name, description, contentType, contentLength);
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
  async uploadFileFromStream(readableStream, name, description, contentType, contentLength) {
    return await this.fileStorage.uploadFileFromStream(readableStream, name, description, contentType, contentLength);
  }

  /**
   * Get signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}[]>} Promise of signatures list.
   */
  async getSignatures(fileId) {
    return await this.fileStorage.getSignatures(fileId);
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
  async addSignature(fileId, signedData, signature, certificate, meta) {
    return await this.fileStorage.addSignature(fileId, signedData, signature, certificate, meta);
  }

  /**
   * Get P7S signature request options.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async getP7sSignatureRequestOptions(fileId, asFile) {
    return await this.fileStorage.getP7sSignatureRequestOptions(fileId, asFile);
  }

  /**
   * Get P7S signature info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7SSignatureInfo(fileId) {
    return await this.fileStorage.getP7SSignatureInfo(fileId);
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @param {string} notLastUserId Not last user ID.
   * @returns {Promise<{id, fileId, p7s, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7sSignature(fileId, asFile, notLastUserId) {
    return await this.fileStorage.getP7sSignature(fileId, asFile, notLastUserId);
  }

  /**
   * Add P7S signature.
   * @param {string} fileId File ID.
   * @param {string} p7s P7S base64 string.
   * @param {object} user User info.
   */
  async addP7sSignature(fileId, p7s, user) {
    return await this.fileStorage.addP7sSignature(fileId, p7s, user);
  }

  /**
   * Update P7S signature.
   * @param {string} id P7S signature ID.
   * @param {string} p7s P7S base64 string.
   */
  async updateP7sSignature(id, p7s) {
    return await this.fileStorage.updateP7sSignature(id, p7s);
  }

  /**
   * Remove P7S signature.
   * @param {string} id P7S signature ID.
   */
  async removeP7sSignature(id) {
    return await this.fileStorage.removeP7sSignature(id);
  }

  /**
   * Copy file.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async copyFile(fileId) {
    return await this.fileStorage.copyFile(fileId);
  }

  /**
   * Create ASIC manifest.
   * @param {string[]} filesIds Files IDs.
   * @param {object} [dataObject] Data object.
   * @returns {object} Manifest file info.
   */
  async createAsicManifest(filesIds = [], dataObject = null) {
    return await this.fileStorage.createAsicManifest(filesIds, dataObject);
  }

  /**
   * Create ASIC request options.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async createAsicRequestOptions(manifestFileId, filesIds) {
    return await this.fileStorage.createAsicRequestOptions(manifestFileId, filesIds);
  }

  /**
   * Create ASIC.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ASIC.
   */
  async createAsic(manifestFileId, filesIds) {
    return await this.fileStorage.createAsic(manifestFileId, filesIds);
  }

  /**
   * Generate file name.
   * @param { string } [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns { string } File name.
   */
  generateFileName(extension) {
    return this.fileStorage.generateFileName(extension);
  }

  /**
   * Generate file name for user.
   * @param {string} userId User ID.
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns {string} File name for user.
   */
  generateFileNameForUser(userId, extension) {
    return this.fileStorage.generateFileNameForUser(userId, extension);
  }

  /**
   * Get p7s metadata by files Ids.
   * @param {number[]} fileIds File ids.
   */
  getP7sMetadata(fileIds) {
    return this.fileStorage.getP7sMetadata(fileIds);
  }

  /**
   * Download file ASiC-S request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers, body}>} Promise of request options.
   */
  async downloadFileAsicsRequestOptions(fileId) {
    return this.fileStorage.downloadFileAsicsRequestOptions(fileId);
  }
}

module.exports = FileStorageProvider;
