const crypto = require('crypto');
const axios = require('axios'); // Only used for streaming upload in uploadFile method

const HttpRequest = require('./http_request');
const { getTraceId } = require('./async_local_storage');

// Constants.
const HIDE_REPLACEMENT_TEXT = '*****';
const MAX_LOG_LENGTH = 100e3 - 1000;

/**
 * File storage.
 */
class FileStorage {
  /**
   * File storage constructor.
   * @param {{apiHost, token, containerId, signatureTimeout, downloadUploadTimeout, timeout}} options File storage options.
   */
  constructor(options) {
    if (!FileStorage.singleton) {
      const {
        apiHost,
        token,
        containerId,
        signatureTimeout = 40000,
        downloadUploadTimeout = 60000,
        timeout = 10000,
      } = options || global.config.filestorage;
      this.apiHost = apiHost;
      this.token = token;
      this.containerId = containerId;
      this.signatureTimeout = signatureTimeout;
      this.downloadUploadTimeout = downloadUploadTimeout;
      this.timeout = timeout;
      FileStorage.singleton = this;
    }
    return FileStorage.singleton;
  }

  /**
   * Get file info.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, name, contentType, contentLength, description, containerId, hash: {md5, sha1}, meta, createdBy, updatedBy, createdAt, updatedAt}>} Promise of file info.
   */
  async getFileInfo(fileId) {
    // Define and return request options.
    log.save('filestorage-get-info-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/info`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.timeout,
    };
    log.save('filestorage-get-info-request-options-defined', { fileId, requestOptions });
    const fileInfoResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-get-info-response', { fileId, fileInfoResponse });
    const { data: fileInfo } = fileInfoResponse;

    return fileInfo;
  }

  /**
   * Delete file.
   * @param {string} fileId File ID.
   * @returns {Promise<{deletedRowsCount: number}>} Promise of deleted info.
   */
  async deleteFile(fileId) {
    // Define and return request options.
    log.save('filestorage-delete-file-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}`,
      method: 'DELETE',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.timeout,
    };
    log.save('filestorage-delete-file-request-options-defined', { fileId, requestOptions });
    const deleteFileInfoResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-delete-file-response', { fileId, deleteFileInfoResponse });
    const { data: deleteFileInfo } = deleteFileInfoResponse;

    return deleteFileInfo;
  }

  /**
   * Download file request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFileRequestOptions(fileId) {
    // Define and return request options.
    log.save('filestorage-download-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadUploadTimeout,
    };
    log.save('filestorage-download-request-options-defined', { fileId, requestOptions });

    return requestOptions;
  }

  /**
   * Download file.
   * @param {string} fileId File ID.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download file.
   */
  async downloadFile(fileId) {
    // Get options to handle file.
    const requestOptions = await this.downloadFileRequestOptions(fileId);

    // Use HttpRequest.send with responseType stream
    const response = await HttpRequest.send({ ...requestOptions, responseType: 'stream' });
    return response.data;
  }

  /**
   * Download file preview request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadFilePreviewRequestOptions(fileId) {
    // Define and return request options.
    log.save('filestorage-download-preview-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/preview`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.timeout,
    };
    log.save('filestorage-download-preview-request-options-defined', { fileId, requestOptions });

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

    // Use HttpRequest.send with responseType stream
    const response = await HttpRequest.send({ ...requestOptions, responseType: 'stream' });
    return response.data;
  }

  /**
   * Download ZIP request options.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async downloadZipRequestOptions(filesIds) {
    // Define and return request options.
    log.save('filestorage-download-zip-request-options-initialized', { filesIds });
    const filesIdsSeparatedByComma = filesIds.join(',');
    const requestOptions = {
      url: `${this.apiHost}/files/${filesIdsSeparatedByComma}/zip`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadUploadTimeout,
    };
    log.save('filestorage-download-zip-request-options-defined', { filesIds, requestOptions });
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

    // Use HttpRequest.send with responseType stream
    const response = await HttpRequest.send({ ...requestOptions, responseType: 'stream' });
    return response.data;
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
    log.save('filestorage-upload-request-options-initialized', { name, description, contentType, contentLength });
    const requestOptions = {
      url: `${this.apiHost}/files?container_id=${this.containerId}&name=${encodeURIComponent(name)}${
        description ? `&description=${encodeURIComponent(description)}` : ''
      }`,
      method: 'POST',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.downloadUploadTimeout,
    };
    if (contentType) {
      requestOptions.headers['Content-Type'] = contentType;
    }
    if (contentLength) {
      requestOptions.headers['Content-Length'] = contentLength;
    }
    log.save('filestorage-upload-request-options-defined', { name, description, contentType, contentLength, requestOptions });
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

    // For axios, we need to create a PassThrough stream for upload
    const { PassThrough } = require('stream');
    const stream = new PassThrough();

    // Convert request options to axios format
    const axiosOptions = {
      method: requestOptions.method || 'POST',
      url: requestOptions.url,
      headers: requestOptions.headers,
      data: stream,
      timeout: requestOptions.timeout,
    };

    // Start the axios request asynchronously
    axios(axiosOptions).catch(() => {
      // Ignore errors here since this is for stream uploads
    });

    return stream;
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
    try {
      // Get options to handle file.
      const requestOptions = await this.uploadFileRequestOptions(name, description, contentType, contentLength);

      const chunks = [];

      const streamToBuffer = new Promise((resolve, reject) => {
        // Add a timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Stream reading timeout'));
        }, 5000);

        readableStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        readableStream.on('end', () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });

        readableStream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // For streams that might already be ended
        if (readableStream.readableEnded) {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        }
      });

      const buffer = await streamToBuffer;

      // Convert request options to HttpRequest format
      const response = await HttpRequest.send({
        ...requestOptions,
        body: buffer,
      });

      // Parse response body - axios should automatically parse JSON, but handle both cases
      let responseData = response.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (parseError) {
          log.save('filestorage-upload-from-stream-error', { name, body: responseData, error: parseError && parseError.message });
          throw parseError;
        }
      }

      // Check for API error in response
      if (responseData && responseData.error) {
        const error = new Error(responseData.error.message || responseData.error);
        log.save('filestorage-upload-from-stream-error', { name, error: error.message });
        throw error;
      }

      const fileInfo = responseData.data || responseData;
      log.save('filestorage-upload-from-stream-result', { name, fileInfo });
      return fileInfo;
    } catch (error) {
      log.save('filestorage-upload-from-stream-error', { name, error: error && error.message });
      throw error;
    }
  }

  /**
   * Get signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, signedData, signature, certificate, meta, createdBy, updatedBy, createdAt, updatedAt}[]>} Promise of signatures list.
   */
  async getSignatures(fileId) {
    // Define request options.
    log.save('filestorage-get-signatures-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures?file_id=${fileId}&limit=1000`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-get-signatures-defined', { fileId, requestOptions });

    // Do request and return result.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-get-signatures-response', { fileId, signaturesResponse });
    const { data: signatures } = signaturesResponse;
    return signatures;
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
    // Define request options.
    log.save('filestorage-add-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/signatures`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: JSON.stringify({ fileId, signedData, signature, certificate, meta }),
      timeout: this.signatureTimeout,
    };
    const ending = '<...cut>';
    const stringifiedBody = requestOptions.body;
    const bodyToLog =
      stringifiedBody.length > MAX_LOG_LENGTH ? stringifiedBody.substring(0, MAX_LOG_LENGTH - ending.length) + ending : stringifiedBody;
    log.save('filestorage-add-signature-defined', { fileId, requestOptions: { ...requestOptions, body: bodyToLog } });

    // Do request and return result.
    const signatureResponse = await HttpRequest.send(requestOptions);

    const signatureToLog =
      signatureResponse?.data?.signature?.length > MAX_LOG_LENGTH / 3
        ? signatureResponse?.data?.signature?.substring(0, MAX_LOG_LENGTH / 3 - ending.length) + ending
        : signatureResponse?.data?.signature;
    const certificateToLog =
      signatureResponse?.data?.certificate?.length > MAX_LOG_LENGTH / 3
        ? signatureResponse?.data?.certificate?.substring(0, MAX_LOG_LENGTH / 3 - ending.length) + ending
        : signatureResponse?.data?.certificate;
    log.save('filestorage-add-signature-response', {
      fileId,
      signatureResponse: {
        ...signatureResponse,
        data: {
          ...signatureResponse.data,
          signature: signatureToLog,
          certificate: certificateToLog,
        },
      },
    });

    const { data: createdSignature } = signatureResponse;
    return createdSignature;
  }

  /**
   * Get P7S signature info request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async getP7sSignatureInfoRequestOptions(fileId) {
    // Define request options.
    log.save('filestorage-get-p7s-signature-info-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/${fileId}/info`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-get-p7s-signatures-info-defined', { fileId, requestOptions });

    return requestOptions;
  }

  /**
   * Get P7S signature reuest options.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @param {string} notLastUserId Not last user ID.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async getP7sSignatureRequestOptions(fileId, asFile = false, notLastUserId) {
    // Define request options.
    log.save('filestorage-get-p7s-signature-initialized', { fileId });
    const queryStringParts = [];
    if (asFile) {
      queryStringParts.push('as_file=true');
    }
    if (notLastUserId) {
      queryStringParts.push(`not_last_user_id=${notLastUserId}`);
    }
    const queryString = queryStringParts.length > 0 ? `?${queryStringParts.join('&')}` : '';
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/p7s${queryString}`,
      method: 'GET',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-get-p7s-signatures-defined', { fileId, requestOptions });
    return requestOptions;
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @returns {Promise<{id, fileId, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7SSignatureInfo(fileId) {
    // Get request options.
    const requestOptions = await this.getP7sSignatureInfoRequestOptions(fileId);

    // Do request.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-get-p7s-signatures-info-response', { fileId, signaturesResponse });
    const { data: p7sSignature } = signaturesResponse;

    return p7sSignature;
  }

  /**
   * Get P7S signature.
   * @param {string} fileId File ID.
   * @param {boolean} asFile Get as file indicator.
   * @param {string} notLastUserId Not last user ID.
   * @returns {Promise<{id, fileId, p7s, meta, createdBy, updatedBy, createdAt, updatedAt}>|Promise<ReadableStream>} Promise of P7S signature.
   */
  async getP7sSignature(fileId, asFile = false, notLastUserId) {
    // Get request options.
    const requestOptions = await this.getP7sSignatureRequestOptions(fileId, asFile, notLastUserId);

    // Do request and return P7S file readable stream if need it.
    if (asFile) {
      // Use HttpRequest.send with responseType stream
      const response = await HttpRequest.send({ ...requestOptions, responseType: 'stream' });
      return response.data;
    }

    // Do request and return BASE64 result in other case.
    const signaturesResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-get-p7s-signatures-response', {
      fileId,
      signaturesResponseData: { ...(signaturesResponse?.data || {}), p7s: HIDE_REPLACEMENT_TEXT },
    }); // Do not log large p7s.
    const { data: p7sSignature } = signaturesResponse;
    const { isLastUserTheSame } = p7sSignature || {};

    // Check user the same.
    if (isLastUserTheSame) {
      throw new Error('User already signed this file (P7S).');
    }

    return p7sSignature;
  }

  /**
   * Add P7S signature.
   * @param {string} fileId File ID.
   * @param {string} p7s P7S base64 string.
   * @param {object} user User info.
   */
  async addP7sSignature(fileId, p7s, user) {
    // Define request options.
    log.save('filestorage-add-p7s-signature-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: JSON.stringify({ fileId, p7s, meta: { user } }),
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-add-p7s-signature-defined', {
      fileId,
      requestOptions: { ...requestOptions, body: JSON.stringify({ fileId, p7s: HIDE_REPLACEMENT_TEXT, meta: { user } }) },
    }); // Do not log large p7s.

    // Do request and return result.
    const createSignatureResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-add-p7s-signature-response', {
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
  async updateP7sSignature(id, p7s) {
    // Define request options.
    log.save('filestorage-update-p7s-signature-initialized', { id });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: JSON.stringify({ p7s }),
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-update-p7s-signature-defined', { id, requestOptions });

    // Do request and return result.
    const updateSignatureResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-update-p7s-signature-response', { id, signatureResponse: updateSignatureResponse });
    const { data: updatedP7sSignature } = updateSignatureResponse;
    return updatedP7sSignature;
  }

  /**
   * Remove P7S signature.
   * @param {string} id P7S signature ID.
   */
  async removeP7sSignature(id) {
    // Define request options.
    log.save('filestorage-remove-p7s-signature-initialized', { id });
    const requestOptions = {
      url: `${this.apiHost}/p7s_signatures/${id}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-remove-p7s-signature-defined', { id, requestOptions });

    // Do request and return result.
    const deleteSignatureResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-remove-p7s-signature-response', { id, signatureResponse: deleteSignatureResponse });
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
    log.save('filestorage-copy-file-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/${fileId}/copy`,
      method: 'POST',
      headers: {
        'x-trace-id': getTraceId(),
        token: this.token,
      },
    };
    log.save('filestorage-copy-file-defined', { fileId, requestOptions });

    // Do request and return result.
    const fileCopyResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-copy-file-response', { fileId, fileCopyResponse });
    const { data: fileCopy } = fileCopyResponse;
    return fileCopy;
  }

  /**
   * Create ASIC manifest.
   * @param {string[]} filesIds Files IDs.
   * @param {object} [dataObject] Data object.
   * @returns {object} Manifest file info.
   */
  async createAsicManifest(filesIds = [], dataObject = null) {
    // Define request options.
    log.save('filestorage-create-asic-manifest-initialized', { filesIds, dataObjectFields: dataObject === null ? null : Object.keys(dataObject) });
    const requestOptions = {
      url: `${this.apiHost}/files/asicmanifest`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: JSON.stringify({ filesIds, dataObject }),
      timeout: this.signatureTimeout,
    };
    const ending = '<...cut>';
    const stringifiedBody = requestOptions.body;
    const bodyToLog =
      stringifiedBody.length > MAX_LOG_LENGTH ? stringifiedBody.substring(0, MAX_LOG_LENGTH - ending.length) + ending : stringifiedBody;
    log.save('filestorage-create-asic-manifest-defined', { requestOptions: { ...requestOptions, body: bodyToLog } });

    // Do request and return result.
    const asicManifestResponse = await HttpRequest.send(requestOptions);
    log.save('filestorage-create-asic-manifest-response', { filesIds, asicManifestResponse });
    const { data: asicManifest } = asicManifestResponse;
    return asicManifest;
  }

  /**
   * Create ASIC request options.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<{url, method, headers}>} Promise of request options.
   */
  async createAsicRequestOptions(manifestFileId, filesIds) {
    // Define and return request options.
    log.save('filestorage-create-asic-request-options-initialized', { filesIds });
    const requestOptions = {
      url: `${this.apiHost}/files/asic`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: JSON.stringify({ manifestFileId, filesIds }),
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-create-asic-request-options-defined', { filesIds, requestOptions });
    return requestOptions;
  }

  /**
   * Create ASIC.
   * @param {string} manifestFileId Manifest file ID.
   * @param {string[]} filesIds Files IDs.
   * @returns {Promise<ReadableStream>} Promise of readable stream to download ASIC.
   */
  async createAsic(manifestFileId, filesIds) {
    // Get options to handle file.
    const requestOptions = await this.createAsicRequestOptions(manifestFileId, filesIds);

    // Use HttpRequest.send with responseType stream
    const response = await HttpRequest.send({ ...requestOptions, responseType: 'stream' });
    return response.data;
  }

  /**
   * Generate file name.
   * @param { string } [extension] Extension as "pdf", "png", "jpg" etc.
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
   * @param {string} [extension] Extension as "pdf", "png", "jpg" etc.
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

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    const fullResponse = true;

    try {
      let responseData = await HttpRequest.send(
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
      log.save('send-ping-request-to-filestorage', responseData);
      const body = responseData && responseData.body;
      const headers = responseData && responseData.response && responseData.response.headers;
      const version = headers && headers.version;
      const customer = headers && headers.customer;
      const environment = headers && headers.environment;
      return { version, customer, environment, body };
    } catch (error) {
      log.save('send-ping-request-to-fiestorage', error.message, 'error');
    }
  }

  /**
   * Get p7s metadata by files Ids.
   * @param {number[]} fileIds File ids.
   */
  async getP7sMetadata(fileIds) {
    // Split file IDs list by parts with 10 items.
    let fileIdsParts = [];
    let fileIdsSlice = fileIds.splice(0, 10);
    while (fileIdsSlice.length > 0) {
      fileIdsParts.push([...fileIdsSlice]);
      fileIdsSlice = fileIds.splice(0, 10);
    }

    // Handle all parts.
    let allP7sMetadata = [];
    for (const fileIdsPart of fileIdsParts) {
      // Define request options.
      const requestOptions = {
        url: `${this.apiHost}/files/${fileIdsPart}/p7s_metadata`,
        method: 'HEAD',
        headers: {
          'x-trace-id': getTraceId(),
          token: this.token,
        },
        timeout: this.signatureTimeout,
      };
      log.save('get-p7s-metadata-request-options', { requestOptions });

      // Do request and return result.
      const resultEncrypted = await HttpRequest.sendHeadRequest(requestOptions, 'p7s-metadata');
      const p7sMetadata = Buffer.from(resultEncrypted, 'base64').toString('utf8');
      log.save('get-p7s-metadata-response', { p7sMetadata });
      const p7sMetaArray = JSON.parse(p7sMetadata || '[]');

      // Append all P7S metadata list.
      allP7sMetadata = [...allP7sMetadata, ...p7sMetaArray];
    }

    // Return all P7S metadata.
    return allP7sMetadata;
  }

  /**
   * Download file ASiC-S request options.
   * @param {string} fileId File ID.
   * @returns {Promise<{url, method, headers, body}>} Promise of request options.
   */
  async downloadFileAsicsRequestOptions(fileId) {
    // Define and return request options.
    log.save('filestorage-download-asics-request-options-initialized', { fileId });
    const requestOptions = {
      url: `${this.apiHost}/files/asics`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      body: JSON.stringify({ fileId }),
      timeout: this.signatureTimeout,
    };
    log.save('filestorage-download-asics-request-options-defined', { fileId, requestOptions });
    return requestOptions;
  }
}

module.exports = FileStorage;
