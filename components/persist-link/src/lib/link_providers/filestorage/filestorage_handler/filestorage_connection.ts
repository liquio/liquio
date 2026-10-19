// Import.
import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';

import axios from 'axios';

import { getLog } from '../../../context';
import { prepareAxiosErrorToLog } from '../../../helpers';
import { redact } from '../../../log_redact';
import HttpRequest from './http_request';

/**
 * Save log with sensitive values (tokens, headers) redacted.
 * @param {string} name Log name.
 * @param {*} [payload] Log payload.
 * @param {...*} rest Other log params.
 */
const saveLog = (name, payload?, ...rest) => getLog().save(name, redact(payload), ...rest);

/**
 * File storage connection.
 */
class FileStorageConnection {
  /**
   * File storage constructor.
   * @param {{apiHost, token, containerId}} options File storage options.
   */
  constructor(options) {
    if (!FileStorageConnection.singleton) {
      const { apiHost, token, containerId, downloadUploadTimeout = 60000, signatureTimeout = 40000 } = options;
      this.apiHost = apiHost;
      this.token = token;
      this.containerId = containerId;
      this.downloadUploadTimeout = downloadUploadTimeout;
      this.signatureTimeout = signatureTimeout;
      FileStorageConnection.singleton = this;
    }
    return FileStorageConnection.singleton;
  }

  /**
   * Get file info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async getFileInfo(fileId) {
    // Define and return request options.
    saveLog('filestorage-get-info-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/info`,
      method: 'GET',
      headers: { token: this.token },
    };
    saveLog('filestorage-get-info-request-options-defined', { fileId, requestOptions });

    const fileInfoResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-get-info-response', { fileId, fileInfoResponse });
    const { data: fileInfo } = fileInfoResponse;
    return fileInfo;
  }

  /**
   *
   * @param {string} token
   * @returns {Promise <{ processPid: number, message: string}>}
   */
  async checkValidToken() {
    const url = `${this.apiHost}/test/ping_with_auth`;

    saveLog('filestorage-check-valid-token-request-initialized', { url });

    const requestOptions = {
      url,
      method: 'GET',
      headers: { token: this.token },
    };

    saveLog('filestorage-check-token-request-defined', {
      url,
      requestOptions,
    });

    const { data, error } = await HttpRequest.send(requestOptions);

    saveLog('filestorage-get-info-response', { url, data });

    return { data, error };
  }

  /**
   * Download file request options.
   * @param {string} fileId File ID.
   * @param {object} additionalOptions Additional options.
   * @param {boolean} additionalOptions.isP7s Must we return link to p7s of file.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFileRequestOptions(fileId, { isP7s = false }) {
    // Define and return request options.
    saveLog('filestorage-download-request-options-initialized', { fileId, isP7s });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}${isP7s ? '/p7s?as_file=true' : ''}`,
      method: 'GET',
      headers: { token: this.token },
      timeout: this.downloadUploadTimeout,
    };
    saveLog('filestorage-download-request-options-defined', {
      fileId,
      requestOptions,
    });
    return requestOptions;
  }

  /**
   * Download file.
   * @param {string} fileId File ID.
   * @param {object} additionalOptions Additional options.
   * @param {boolean} additionalOptions.isP7s Must we return link to p7s of file.
   * @returns {Promise<import('http').IncomingMessage>} Promise of readable stream to download file (with upstream status code and headers).
   */
  async downloadFile(fileId, { isP7s = false }) {
    // Get options to handle file.
    const requestOptions = await this.downloadFileRequestOptions(fileId, { isP7s });
    return HttpRequest.stream(requestOptions);
  }

  /**
   * Download file without stream.
   * @param {string} fileId File ID.
   * @param {object} additionalOptions Additional options.
   * @param {boolean} additionalOptions.isP7s Must we return link to p7s of file.
   * @returns {Promise<string>} Promise to download file.
   */
  async downloadFileWithoutStream(fileId, { isP7s = false } = {}) {
    // Get options to handle file.
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}${isP7s ? '/p7s?as_file=true' : ''}`,
      method: 'GET',
      headers: { token: this.token },
      timeout: this.downloadUploadTimeout,
      responseType: 'arraybuffer',
    };
    saveLog('filestorage-download-without-stream-request-options-defined', {
      fileId,
      requestOptions,
    });

    try {
      const response = await axios(requestOptions);
      if (response.status !== 200) {
        throw new Error(`Cannot download file (${fileId}) from filestorage. ${response.data.toString('utf-8')}`);
      }
      return response.data;
    } catch (error) {
      saveLog('filestorage-download-file-without-stream|error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Download file preview request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFilePreviewRequestOptions(fileId) {
    // Define and return request options.
    saveLog('filestorage-download-preview-request-options-initialized', {
      fileId,
    });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/preview`,
      method: 'GET',
      headers: { token: this.token },
      timeout: this.downloadUploadTimeout,
    };
    saveLog('filestorage-download-preview-request-options-defined', {
      fileId,
      requestOptions,
    });
    return requestOptions;
  }

  /**
   * Download file preview.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file preview.
   */
  async downloadFilePreview(fileId) {
    // Get options to handle file.
    const requestOptions = await this.downloadFilePreviewRequestOptions(fileId);
    return HttpRequest.stream(requestOptions);
  }

  /**
   * Download ZIP request options.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadZipRequestOptions(filesIds) {
    // Define and return request options.
    saveLog('filestorage-download-zip-request-options-initialized', {
      filesIds,
    });
    const filesIdsSeparatedByComma = filesIds.join(',');
    const requestOptions = {
      url: `${this.apiHost}/files/${filesIdsSeparatedByComma}/zip`,
      method: 'GET',
      headers: { token: this.token },
      timeout: this.downloadUploadTimeout,
    };
    saveLog('filestorage-download-zip-request-options-defined', {
      filesIds,
      requestOptions,
    });
    return requestOptions;
  }

  /**
   * Download ZIP.
   * @param {string[]} filesIds FilesIDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ZIP.
   */
  async downloadZip(filesIds) {
    // Get options to handle file.
    const requestOptions = await this.downloadZipRequestOptions(filesIds);
    return HttpRequest.stream(requestOptions);
  }

  /**
   * Upload file request options.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async uploadFileRequestOptions(name, description = '', contentType, contentLength) {
    // Define and return request options.
    saveLog('filestorage-upload-request-options-initialized', {
      name,
      description,
      contentType,
      contentLength,
    });
    const requestOptions = {
      url: `${this.apiHost}/files?container_id=${this.containerId}&name=${encodeURIComponent(name)}${
        description ? `&description=${encodeURIComponent(description)}` : ''
      }`,
      method: 'POST',
      headers: { token: this.token },
      timeout: this.downloadUploadTimeout,
    };
    if (contentType) {
      requestOptions.headers['Content-Type'] = contentType;
    }
    if (contentLength) {
      requestOptions.headers['Content-Length'] = contentLength;
    }
    saveLog('filestorage-upload-request-options-defined', {
      name,
      description,
      contentType,
      contentLength,
      requestOptions,
    });
    return requestOptions;
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
    // Get options to handle file.
    const requestOptions = await this.uploadFileRequestOptions(name, description, contentType, contentLength);
    const uploadStream = new PassThrough();
    HttpRequest.upload(requestOptions, uploadStream).catch((error) => uploadStream.destroy(error));
    return uploadStream;
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
    // Get options to handle file.
    const requestOptions = await this.uploadFileRequestOptions(name, description, contentType, contentLength);
    const body = await HttpRequest.upload(requestOptions, readableStream);

    // Parse body.
    const { error, data: fileInfo } = JSON.parse(body);
    if (error) throw new Error(error.message || error);
    saveLog('filestorage-upload-from-stream-result', { name, fileInfo });
    return fileInfo;
  }

  /**
   * Get signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}[]>} Promise of signatures list.
   */
  async getSignatures(fileId) {
    // Define request options.
    saveLog('filestorage-get-signatures-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures?file_id=${fileId}&limit=1000`,
      method: 'GET',
      headers: { token: this.token },
      timeout: this.signatureTimeout,
    };
    saveLog('filestorage-get-signatures-defined', { fileId, requestOptions });

    // Do request and return result.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-get-signatures-response', {
      fileId,
      signaturesResponse,
    });
    const { data: signatures } = signaturesResponse;
    return signatures;
  }

  /**
   * Add signature.
   * @param {string} fileId File ID.
   * @param {string} signedData Signed data.
   * @param {string} signature Signature.
   * @param {string} certificate Certificate.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of signature.
   */
  async addSignature(fileId, signedData, signature, certificate) {
    // Define request options.
    saveLog('filestorage-add-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: this.token,
      },
      body: JSON.stringify({ fileId, signedData, signature, certificate }),
      timeout: this.signatureTimeout,
    };
    saveLog('filestorage-add-signature-defined', { fileId, requestOptions });

    // Do request and return result.
    const signatureResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-add-signature-response', {
      fileId,
      signatureResponse,
    });
    const { data: createdSignature } = signatureResponse;
    return createdSignature;
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @returns {Promise<{id, fileId, p7s, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7sSignature(fileId, asFile = false) {
    // Define request options.
    saveLog('filestorage-get-p7s-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/p7s${asFile ? '?as_file=true' : ''}`,
      method: 'GET',
      headers: { token: this.token },
      timeout: this.signatureTimeout,
    };
    saveLog('filestorage-get-p7s-signatures-defined', {
      fileId,
      requestOptions,
    });

    // Do request and return P7S file readable stream if need it.
    if (asFile) {
      return HttpRequest.stream(requestOptions);
    }

    // Do request and return BASE64 result in other case.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-get-p7s-signatures-response', {
      fileId,
      signaturesResponse,
    });
    const { data: p7sSignature } = signaturesResponse;
    return p7sSignature;
  }

  /**
   * Add P7S signature.
   * @param {string} fileId File ID.
   * @param {string} p7s P7S base64 string.
   */
  async addP7sSignature(fileId, p7s) {
    // Define request options.
    saveLog('filestorage-add-p7s-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: this.token,
      },
      body: JSON.stringify({ fileId, p7s }),
      timeout: this.signatureTimeout,
    };
    saveLog('filestorage-add-p7s-signature-defined', {
      fileId,
      requestOptions,
    });

    // Do request and return result.
    const createSignatureResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-add-p7s-signature-response', {
      fileId,
      signatureResponse: createSignatureResponse,
    });
    const { data: createdP7sSignature } = createSignatureResponse;
    return createdP7sSignature;
  }

  /**
   * Update P7S signature.
   * @param {string} id P7S signature ID.
   * @param {string} p7s P7S base64 string.
   */
  async updateP7sSignature(id, p7s) {
    // Define request options.
    saveLog('filestorage-update-p7s-signature-initialized', { id });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        token: this.token,
      },
      body: JSON.stringify({ p7s }),
      timeout: this.signatureTimeout,
    };
    saveLog('filestorage-update-p7s-signature-defined', {
      id,
      requestOptions,
    });

    // Do request and return result.
    const updateSignatureResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-update-p7s-signature-response', {
      id,
      signatureResponse: updateSignatureResponse,
    });
    const { data: updatedP7sSignature } = updateSignatureResponse;
    return updatedP7sSignature;
  }

  /**
   * Remove P7S signature.
   * @param {string} id P7S signature ID.
   */
  async removeP7sSignature(id) {
    // Define request options.
    saveLog('filestorage-remove-p7s-signature-initialized', { id });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/${id}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        token: this.token,
      },
      timeout: this.signatureTimeout,
    };
    saveLog('filestorage-remove-p7s-signature-defined', {
      id,
      requestOptions,
    });

    // Do request and return result.
    const deleteSignatureResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-remove-p7s-signature-response', {
      id,
      signatureResponse: deleteSignatureResponse,
    });
    const { data: p7sSignatureDeletingResult } = deleteSignatureResponse;
    return p7sSignatureDeletingResult;
  }

  /**
   * Copy file.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async copyFile(fileId) {
    // Define request options.
    saveLog('filestorage-copy-file-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/copy`,
      method: 'POST',
      headers: { token: this.token },
      timeout: this.downloadUploadTimeout,
    };
    saveLog('filestorage-copy-file-defined', { fileId, requestOptions });

    // Do request and return result.
    const fileCopyResponse = await HttpRequest.send(requestOptions);
    saveLog('filestorage-copy-file-response', { fileId, fileCopyResponse });
    const { data: fileCopy } = fileCopyResponse;
    return fileCopy;
  }

  /**
   * Generate file name.
   * @param { string } [extension] Extension as 'pdf', 'png', 'jpg' etc.
   * @returns { string } File name.
   */
  generateFileName(extension) {
    const fileName = crypto.randomBytes(40).toString('hex');
    const extensionSuffix = extension ? `.${extension}` : '';
    const fileNameWithExtensionSuffix = `${fileName}${extensionSuffix}`;
    return fileNameWithExtensionSuffix;
  }

  /**
   * Generate file name for user.
   * @param {string} userId User ID.
   * @param {string} [extension] Extension as 'pdf', 'png', 'jpg' etc.
   * @returns {string} File name for user.
   */
  generateFileNameForUser(userId, extension) {
    // Check user ID.
    if (typeof userId !== 'string' || userId === '') {
      throw new TypeError('Incorrect user ID.');
    }

    // Define file name parts.
    const fileNamePrefix = this.generateFileName(extension);
    const fileNameSuffix = this.getFileNameForUserSuffix(fileNamePrefix, userId);

    // Define and return file name.
    const fileName = `${fileNamePrefix}${'-'}${fileNameSuffix}`;
    return fileName;
  }
}

// Export.
export default FileStorageConnection;
