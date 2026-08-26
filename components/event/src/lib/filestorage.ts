import crypto from 'node:crypto';
import axios from 'axios';

import { HttpRequest } from './http_request';
import { getTraceId } from '@liquio/back-core';
import { Helpers } from './helpers';
import { getConfig } from './config';

const { prepareAxiosErrorToLog } = Helpers;

const HIDE_REPLACEMENT_TEXT = '*****';

/**
 * File storage.
 */
export class FileStorage {
  static singleton: FileStorage;

  apiHost: string;
  token: string;
  containerId: string;
  getFileTimeout: number;
  downloadFileTimeout: number;
  getSetSignatureTimeout: number;
  createAsicTimeout: number;

  /**
   * File storage constructor.
   * @param {{apiHost, token, containerId}} options File storage options.
   */
  constructor(options?: any) {
    if (!FileStorage.singleton) {
      const {
        apiHost,
        token,
        containerId,
        getFileTimeout = 60000,
        downloadFileTimeout = 60000,
        getSetSignatureTimeout = 40000,
        createAsicTimeout = 60000,
      } = options || getConfig().filestorage;
      this.apiHost = apiHost;
      this.token = token;
      this.containerId = containerId;
      this.getFileTimeout = getFileTimeout;
      this.downloadFileTimeout = downloadFileTimeout;
      this.getSetSignatureTimeout = getSetSignatureTimeout;
      this.createAsicTimeout = createAsicTimeout;
      FileStorage.singleton = this;
    }
    return FileStorage.singleton;
  }

  /**
   * Get file info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async getFileInfo(fileId: string): Promise<any> {
    // Define and return request options.
    global.log.save('filestorage-get-info-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/info`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getFileTimeout,
    };
    global.log.save('filestorage-get-info-request-options-defined', { fileId, requestOptions });
    const fileInfoResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-get-info-response', { fileId, fileInfoResponse });
    const { data: fileInfo } = fileInfoResponse;
    return fileInfo;
  }

  /**
   * Download file request options.
   * @param {string} fileId File ID.
   * @param {string} encoding Response encoding.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFileRequestOptions(fileId: string, encoding: string | null = null): Promise<any> {
    // Define and return request options.
    global.log.save('filestorage-download-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadFileTimeout,
      responseType: encoding === null ? 'arraybuffer' : encoding,
    };
    global.log.save('filestorage-download-request-options-defined', { fileId, requestOptions });
    return requestOptions;
  }

  /**
   * Download file.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file.
   */
  async downloadFile(fileId: string): Promise<any> {
    // Get options to handle file.
    const requestOptions = await this.downloadFileRequestOptions(fileId);
    return (await axios(requestOptions)).data;
  }

  /**
   * Download file without stream.
   * @param {string} fileId File ID.
   * @param {boolean} isCheckStatusCode Check status code flag.
   * @returns {Promise<string>} Promise to download file.
   */
  async downloadFileWithoutStream(fileId: string, isCheckStatusCode = false): Promise<any> {
    // Get options to handle file.
    const requestOptions = await this.downloadFileRequestOptions(fileId);
    try {
      const response = await axios(requestOptions);
      if (isCheckStatusCode && response.status !== 200) {
        throw new Error(`Cannot download file (${fileId}) from filestorage. ${response.data.toString('utf-8')}`);
      }
      return response.data;
    } catch (error: any) {
      global.log.save('filestorage-download-file-without-stream|error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Download file preview request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFilePreviewRequestOptions(fileId: string): Promise<any> {
    // Define and return request options.
    global.log.save('filestorage-download-preview-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/preview`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadFileTimeout,
    };
    global.log.save('filestorage-download-preview-request-options-defined', { fileId, requestOptions });
    return requestOptions;
  }

  /**
   * Download file preview.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file preview.
   */
  async downloadFilePreview(fileId: string): Promise<any> {
    // Get options to handle file.
    const requestOptions = await this.downloadFilePreviewRequestOptions(fileId);
    return (await axios(requestOptions)).data;
  }

  /**
   * Download ZIP request options.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadZipRequestOptions(filesIds: string[]): Promise<any> {
    // Define and return request options.
    global.log.save('filestorage-download-zip-request-options-initialized', { filesIds });
    const filesIdsSeparatedByComma = filesIds.join(',');
    const requestOptions = {
      url: `${this.apiHost}/files/${filesIdsSeparatedByComma}/zip`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadFileTimeout,
    };
    global.log.save('filestorage-download-zip-request-options-defined', { filesIds, requestOptions });
    return requestOptions;
  }

  /**
   * Download ZIP.
   * @param {string[]} filesIds FilesIDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ZIP.
   */
  async downloadZip(filesIds: string[]): Promise<any> {
    // Get options to handle file.
    const requestOptions = await this.downloadZipRequestOptions(filesIds);
    return (await axios(requestOptions)).data;
  }

  /**
   * Upload file request options.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {number} contentLength Content-length.
   * @param {string} isSetExtension Is need set file extension.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async uploadFileRequestOptions(name: string, description = '', contentType?: string, contentLength?: number, isSetExtension = false): Promise<any> {
    // Define and return request options.
    global.log.save('filestorage-upload-request-options-initialized', { name, description, contentType, contentLength });
    const requestOptions: any = {
      url: `${this.apiHost}/files?container_id=${this.containerId}&name=${encodeURIComponent(name)}${
        description ? `&description=${encodeURIComponent(description)}` : ''
      }&is_set_extension=${isSetExtension}&with_preview=false`,
      method: 'POST',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getFileTimeout,
    };
    if (contentType) {
      requestOptions.headers['Content-Type'] = contentType;
    }
    if (contentLength) {
      requestOptions.headers['Content-Length'] = contentLength;
    }
    global.log.save('filestorage-upload-request-options-defined', { name, description, contentType, contentLength, requestOptions });
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
  async uploadFile(name: string, description?: string, contentType?: string, contentLength?: number): Promise<any> {
    // Get options to handle file.
    const requestOptions = await this.uploadFileRequestOptions(name, description, contentType, contentLength);
    const response = await axios(requestOptions);
    return response.data;
  }

  /**
   * Upload file from stream.
   * @param {ReadableStream} readableStream Readable stream to upload file.
   * @param {string} name File name.
   * @param {string} description File description.
   * @param {string} contentType Content-type.
   * @param {string} isSetExtension Is need set file extension.
   * @param {number} contentLength Content-length.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async uploadFileFromStream(
    readableStream: any,
    name: string,
    description?: string,
    contentType?: string,
    contentLength?: number,
    isSetExtension = false,
  ): Promise<any> {
    const requestOptions = await this.uploadFileRequestOptions(name, description, contentType, contentLength, isSetExtension);
    try {
      const { data: response } = await axios({
        ...requestOptions,
        data: readableStream,
      });
      const { error, data } = response;
      if (error) throw new Error(error.message || error);
      global.log.save('filestorage-upload-from-stream-result', { name, fileInfo: data });
      return data;
    } catch (error: any) {
      global.log.save('filestorage-upload-from-stream-error', prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Get signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}[]>} Promise of signatures list.
   */
  async getSignatures(fileId: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-get-signatures-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures?file_id=${fileId}&limit=1000`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-get-signatures-defined', { fileId, requestOptions });

    // Do request and return result.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-get-signatures-response', { fileId, signaturesResponse });
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
  async addSignature(fileId: string, signedData: string, signature: string, certificate: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-add-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: { fileId, signedData, signature, certificate },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-add-signature-defined', { fileId, requestOptions });

    // Do request and return result.
    const signatureResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-add-signature-response', { fileId, signatureResponse });
    const { data: createdSignature } = signatureResponse;
    return createdSignature;
  }

  /**
   * Get P7S signature reuest options.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @param {boolean} asBase64 Get as Base64 indicator.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async getP7sSignatureRequestOptions(fileId: string, asFile = false, asBase64 = false): Promise<any> {
    // Define request options.
    global.log.save('filestorage-get-p7s-signature-initialized', { fileId });
    const requestOptions: any = {
      url: `${this.apiHost}/files/${fileId}/p7s${asFile ? '?as_file=true' : ''}${asFile && asBase64 ? '&as_base64=true' : ''}`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getSetSignatureTimeout,
    };
    if (asFile) {
      requestOptions.responseType = 'stream';
    }
    global.log.save('filestorage-get-p7s-signatures-defined', { fileId, requestOptions });
    return requestOptions;
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @param {boolean} asBase64 Get as Base64 indicator.
   * @returns {Promise<{id, fileId, p7s, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7sSignature(fileId: string, asFile = false, asBase64 = false): Promise<any> {
    // Get request options.
    const requestOptions = await this.getP7sSignatureRequestOptions(fileId, asFile, asBase64);

    // Do request and return P7S file readable stream if need it.
    if (asFile) {
      return (await axios(requestOptions)).data;
    }

    // Do request and return BASE64 result in other case.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-get-p7s-signatures-response', {
      fileId,
      signaturesResponseData: { ...(signaturesResponse?.data || {}), p7s: HIDE_REPLACEMENT_TEXT },
    }); // Do not log large p7s.
    const { data: p7sSignature } = signaturesResponse;
    return p7sSignature;
  }

  /**
   * Add P7S signature.
   * @param {string} fileId File ID.
   * @param {string} p7s P7S base64 string.
   */
  async addP7sSignature(fileId: string, p7s: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-add-p7s-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: { fileId, p7s },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-add-p7s-signature-defined', {
      fileId,
      requestOptions: { ...requestOptions, body: JSON.stringify({ fileId, p7s: HIDE_REPLACEMENT_TEXT }) },
    }); // Do not log large p7s.

    // Do request and return result.
    const createSignatureResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-add-p7s-signature-response', {
      fileId,
      signatureResponse: { ...(createSignatureResponse?.data || {}), p7s: HIDE_REPLACEMENT_TEXT },
    }); // Do not log large p7s.
    const { data: createdP7sSignature } = createSignatureResponse;
    return createdP7sSignature;
  }

  /**
   * Update P7S signature.
   * @param {string} id P7S signature ID.
   * @param {string} p7s P7S base64 string.
   */
  async updateP7sSignature(id: string, p7s: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-update-p7s-signature-initialized', { id });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: { p7s },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-update-p7s-signature-defined', { id, requestOptions });

    // Do request and return result.
    const updateSignatureResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-update-p7s-signature-response', { id, signatureResponse: updateSignatureResponse });
    const { data: updatedP7sSignature } = updateSignatureResponse;
    return updatedP7sSignature;
  }

  /**
   * Delete file.
   * @param {string} id File ID.
   */
  async deleteFile(id: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-delete-file-initialized', { id });
    const requestOptions = {
      url: `${this.apiHost}/files/${id}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-delete-file-defined', { id, requestOptions });

    // Do request and return result.
    const deleteSignatureResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-delete-file-response', { id, signatureResponse: deleteSignatureResponse });
    const { data: p7sSignatureDeletingResult } = deleteSignatureResponse;
    return p7sSignatureDeletingResult;
  }

  /**
   * Delete signature by file ID.
   * @param {string} fileId File ID.
   */
  async deleteSignatureByFileId(fileId: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-delete-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures/file/${fileId}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-delete-signature-defined', { fileId, requestOptions });

    // Do request and return result.
    const deleteSignatureResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-delete-signature-response', { fileId, signatureResponse: deleteSignatureResponse });
    const { data: p7sSignatureDeletingResult } = deleteSignatureResponse;
    return p7sSignatureDeletingResult;
  }

  /**
   * Delete P7S signature by file ID.
   * @param {string} fileId File ID.
   */
  async deleteP7sSignatureByFileId(fileId: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-delete-p7s-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/file/${fileId}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.getSetSignatureTimeout,
    };
    global.log.save('filestorage-delete-p7s-signature-defined', { fileId, requestOptions });

    // Do request and return result.
    const deleteSignatureResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-delete-p7s-signature-response', { fileId, signatureResponse: deleteSignatureResponse });
    const { data: p7sSignatureDeletingResult } = deleteSignatureResponse;
    return p7sSignatureDeletingResult;
  }

  /**
   * Copy file.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async copyFile(fileId: string): Promise<any> {
    // Define request options.
    global.log.save('filestorage-copy-file-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/copy`,
      method: 'POST',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadFileTimeout,
    };
    global.log.save('filestorage-copy-file-defined', { fileId, requestOptions });

    // Do request and return result.
    const fileCopyResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-copy-file-response', { fileId, fileCopyResponse });
    const { data: fileCopy } = fileCopyResponse;
    return fileCopy;
  }

  /**
   * Create ASIC manifest.
   * @param {string[]} filesIds Files IDs.
   * @returns {object} Manifest file info.
   */
  async createAsicManifest(filesIds: string[] = []): Promise<any> {
    // Define request options.
    global.log.save('filestorage-create-asic-manifest-initialized', { filesIds });
    const requestOptions = {
      url: `${this.apiHost}/files/asicmanifest`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: { filesIds },
      timeout: this.createAsicTimeout,
    };
    global.log.save('filestorage-create-asic-manifest-defined', { filesIds, requestOptions });

    // Do request and return result.
    const asicManifestResponse = await HttpRequest.send(requestOptions);
    global.log.save('filestorage-create-asic-manifest-response', { filesIds, asicManifestResponse });
    const { data: asicManifest } = asicManifestResponse;
    return asicManifest;
  }

  /**
   * Create ASIC request options.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async createAsicRequestOptions(manifestFileId: string, filesIds: string[]): Promise<any> {
    // Define and return request options.
    global.log.save('filestorage-create-asic-request-options-initialized', { filesIds });
    const requestOptions = {
      url: `${this.apiHost}/files/asic`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      data: { manifestFileId, filesIds },
      timeout: this.createAsicTimeout,
    };
    global.log.save('filestorage-create-asic-request-options-defined', { filesIds, requestOptions });
    return requestOptions;
  }

  /**
   * Create ASIC.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ASIC.
   */
  async createAsic(manifestFileId: string, filesIds: string[]): Promise<any> {
    // Get options to handle file.
    const requestOptions = await this.createAsicRequestOptions(manifestFileId, filesIds);
    return (await axios(requestOptions)).data;
  }

  /**
   * Generate file name.
   * @param { string } [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns { string } File name.
   */
  generateFileName(extension?: string): string {
    const fileName = crypto.randomBytes(40).toString('hex');
    const extensionSuffix = extension ? `.${extension}` : '';
    const fileNameWithExtensionSuffix = `${fileName}${extensionSuffix}`;
    return fileNameWithExtensionSuffix;
  }

  /**
   * Generate file name for user.
   * @deprecated
   * @param {string} userId User ID.
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
   * @returns {string} File name for user.
   */
  generateFileNameForUser(userId: string, extension?: string): string {
    // Check user ID.
    if (typeof userId !== 'string' || userId === '') {
      throw new TypeError('Incorrect user ID.');
    }

    // Define file name parts.
    const fileNamePrefix = this.generateFileName(extension);

    // WARNING: this method does not exist
    const fileNameSuffix = (this as any).getFileNameForUserSuffix(fileNamePrefix, userId);

    // Define and return file name.
    const fileName = `${fileNamePrefix}${'-'}${fileNameSuffix}`;
    return fileName;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    const fullResponse = true;

    try {
      const response = await HttpRequest.send(
        {
          url: `${this.apiHost}/test/ping_with_auth`,
          method: HttpRequest.Methods.GET,
          headers: {
            'x-trace-id': getTraceId(),
            token: this.token,
          },
        },
        fullResponse,
      );
      global.log.save('send-ping-request-to-filestorage', response);
      const headers = response?.fullResponse?.headers;
      const { version, customer, environment } = headers;
      const body = response?.body?.data;
      return { version, customer, environment, body };
    } catch (error: any) {
      global.log.save('send-ping-request-to-fiestorage', error.message);
    }
  }

  /**
   * Get file.
   * @param {string} fileId File ID.
   * @param {boolean} [isP7s] Is P7S.
   * @returns {Promise<{name, description, contentType, fileContent}>} File info with base64 content.
   */
  async getFile(fileId: string, isP7s = false): Promise<any> {
    // Get file info.
    const fileInfo = await this.getFileInfo(fileId);
    const { name, description, contentType } = fileInfo;

    // Get P7S.
    if (isP7s) {
      const p7sFile = await this.getP7sSignature(fileId, false, true);
      const { p7s: fileContent } = p7sFile;
      return { fileId, name: `${name}.p7s`, description, contentType, fileContent };
    }

    // Get not signed file.
    const fileContentBuffer = await this.downloadFileWithoutStream(fileId);
    const fileContent = fileContentBuffer.toString('base64');
    return { fileId, name, description, contentType, fileContent };
  }
}
