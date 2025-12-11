/**
 * Provider.
 */
class Provider {
  /**
   * Provider name.
   * @returns {PROVIDER_NAME} Files provider name.
   */
  static get ProviderName() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Download file request options.
   * @param {string} filePath File path.
   * @returns {Promise<object>} Request options.
   */
  async downloadFileRequestOptions() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Download file.
   * @param {string} filePath File path.
   * @returns {Promise<ReadableStream>} Readable stream to download file.
   */
  async downloadFile() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Download file as buffer.
   * @param {string} filePath File path.
   * @returns {Promise<Buffer>} File buffer.
   */
  async downloadFileAsBuffer() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Upload file request options.
   * @param {string} filePath File path.
   * @param {string} contentType Content-type.
   * @param {ReadableStream|string|Buffer} fileContent File content as readable stream or string.
   * @returns {Promise<WritableStream>} Writable stream to upload file.
   */
  async uploadFileRequestOptions() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Upload file.
   * @param {string} filePath File path.
   * @param {string} contentType Content-type.
   * @param {ReadableStream|string|Buffer} fileContent File content as readable stream or string.
   * @returns {Promise<{fileLink, hash, isHashCanBeUsedToSign: false}>} Promise of file info.
   */
  async uploadFile() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Delete file.
   * @param {string} filePath File path.
   * @param {string} [containerName] Container name.
   * @returns {Promise<any>} Deleting result.
   */
  async deleteFile() {
    throw new Error('Should be defined in provider class.');
  }

  /**
   * Get provider metadata.
   * @param {string} [containerName] Container name.
   * @returns {Promise<any>} Result.
   */
  async getMetadata() {
    throw new Error('Should be defined in provider class.');
  }
}

module.exports = Provider;
