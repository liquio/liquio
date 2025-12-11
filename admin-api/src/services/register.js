const querystring = require('querystring');

const HttpRequest = require('../lib/http_request');
const { getTraceId } = require('../lib/async_local_storage');

// Constants.
const ROUTES = {
  getRegisters: '/registers',
  getKeys: '/keys',
  getRecords: '/records',
  pingWithAuth: '/test/ping_with_auth',
  getSyncedKeys: '/keys/synced',
  getAllSyncedKeys: '/keys/allSynced',
};

/**
 * Register service.
 */
class RegisterService {
  /**
   * Register constructor.
   */
  constructor() {
    // Define singleton.
    if (!RegisterService.singleton) {
      this.server = config.register.server;
      this.port = config.register.port;
      this.token = config.register.token;
      this.timeout = config.register.timeout || 30000;
      RegisterService.singleton = this;
    }

    // Return singleton.
    return RegisterService.singleton;
  }

  generateHeaders(accessInfo) {
    const headers = {
      'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
      'x-trace-id': getTraceId(),
      token: this.token,
    };

    if (accessInfo) {
      headers['access-info'] = this.prepareAccessInfo(accessInfo);
    }

    return headers;
  }

  /**
   * Get registers.
   * @param {object} params Params.
   * @param {number} params.parentId Parent ID.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @returns {Promise<object[]>}
   */
  async getRegisters(params) {
    const url = this.getUrlWithQueryParams(ROUTES.getRegisters, params);

    try {
      const response = await HttpRequest.send({
        url: url,
        method: HttpRequest.Methods.GET,
        headers: this.generateHeaders(),
        timeout: this.timeout,
      });

      return response;
    } catch (error) {
      this.handleError('register-request-get-registers-error', error);
    }
  }

  /**
   * Find register by ID.
   * @param {number} id Register ID.
   * @returns {Promise<object[]>}
   */
  async findRegisterById(id) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRegisters}/${id}`,
        method: HttpRequest.Methods.GET,
        headers: this.generateHeaders(),
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-get-register-error', error);
    }
  }

  /**
   * Create register.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async createRegister(data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRegisters}`,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-post-register-error', error);
    }
  }

  /**
   * Update register by ID.
   * @param {number} id ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async updateRegisterById(id, data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRegisters}/${id}`,
        method: HttpRequest.Methods.PUT,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-put-register-error', error);
    }
  }

  /**
   * Delete register by ID.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   */
  async deleteRegisterById(id, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRegisters}/${id}`,
        method: HttpRequest.Methods.DELETE,
        headers: this.generateHeaders(accessInfo),
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-delete-register-error', error);
    }
  }

  /**
   * Get keys.
   * @returns {Promise<object[]>}
   * @param {object} params Params.
   * @param {number} params.register_id Register ID.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   */
  async getKeys(params) {
    const url = this.getUrlWithQueryParams(ROUTES.getKeys, params);
    const requestOptions = {
      url: url,
      method: HttpRequest.Methods.GET,
      headers: this.generateHeaders(),
      timeout: this.timeout,
    };

    try {
      const response = await HttpRequest.send(requestOptions);
      return response;
    } catch (error) {
      this.handleError('register-request-get-keys-error', { error, requestOptions });
    }
  }

  /**
   * Find key by ID.
   * @param {number} id Key ID.
   * @returns {Promise<object[]>}
   */
  async findKeyById(id) {
    const requestOptions = {
      url: `${this.server}:${this.port}${ROUTES.getKeys}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: this.generateHeaders(),
      timeout: this.timeout,
    };

    try {
      const response = await HttpRequest.send(requestOptions);
      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-get-keys-error', { error, requestOptions });
    }
  }

  /**
   *
   * @param {number} keyId
   * @param {string} mapping
   * @returns
   */
  async updateIndexMapping(keyId, mapping) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getKeys}/${keyId}/mapping`,
        method: HttpRequest.Methods.PUT,
        headers: this.generateHeaders(),
        json: true,
        body: { mapping },
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-put-key-index-mapping-error', error);
    }
  }

  /**
   * Get register synced keys.
   * @param {string} ids key ids.
   * @returns {Promise<object[]>}
   */
  async getSyncedKeys(ids) {
    const requestOptions = {
      url: `${this.server}:${this.port}${ROUTES.getSyncedKeys}?ids=${ids}`,
      method: HttpRequest.Methods.GET,
      headers: this.generateHeaders(),
      timeout: this.timeout,
    };
    try {
      const response = await HttpRequest.send(requestOptions);

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-get-synced-keys-error', { error, requestOptions });
    }
  }

  /**
   * Get all synced keys.
   * @returns {Promise<object[]>}
   */
  async getAllSyncedKeys() {
    const requestOptions = {
      url: `${this.server}:${this.port}${ROUTES.getAllSyncedKeys}`,
      method: HttpRequest.Methods.GET,
      headers: this.generateHeaders(),
      timeout: this.timeout,
    };

    try {
      const response = await HttpRequest.send(requestOptions);
      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-get-keys-error', { error, requestOptions });
    }
  }

  /**
   * Create key.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async createKey(data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getKeys}`,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-post-key-error', error);
    }
  }

  /**
   * Update key by ID.
   * @param {number} id ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async updateKeyById(id, data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getKeys}/${id}`,
        method: HttpRequest.Methods.PUT,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-put-key-error', error);
    }
  }

  /**
   * Delete key by ID.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   */
  async deleteKeyById(id, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getKeys}/${id}`,
        method: HttpRequest.Methods.DELETE,
        headers: this.generateHeaders(accessInfo),
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-delete-key-error', error);
    }
  }

  /**
   * Export.
   * @param {number} id Register ID.
   * @param {object} params Params.
   * @param {boolean} params.with_data With data.
   * @param {boolean} params.file File.
   * @returns {Promise<object>}
   */
  async export(id, { withData, file, keyIds }) {
    const params = { with_data: withData, file, key_ids: keyIds };
    const url = this.getUrlWithQueryParams(`${ROUTES.getRegisters}/${id}/export`, params);

    try {
      const requestOptions = {
        url: url,
        method: HttpRequest.Methods.GET,
        headers: this.generateHeaders(),
      };

      if (file) {
        return requestOptions;
      }
      const response = await HttpRequest.send(requestOptions);

      return response;
    } catch (error) {
      this.handleError('register-request-export-error', error);
    }
  }

  /**
   * Import.
   * @param {object} params Params.
   * @param {boolean} params.force Force.
   * @param {boolean} params.rewriteSchema Rewrite schema.
   * @param {boolean} params.clearRecords Clear records.
   * @param {boolean} params.addData Add data.
   * @param {boolean} params.file File.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async import({ force, rewriteSchema, clearRecords, addData, file }, data, accessInfo = {}) {
    const params = {
      force,
      rewrite_schema: rewriteSchema,
      clear_records: clearRecords,
      add_data: addData,
      file,
    };
    const url = this.getUrlWithQueryParams(`${ROUTES.getRegisters}/import`, params);

    try {
      let requestOptions = {
        url: url,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(accessInfo),
      };

      if (file) {
        requestOptions.headers['Content-Type'] = 'application/octet-stream';
        return requestOptions;
      } else {
        requestOptions.json = true;
        requestOptions.body = data;
      }

      const response = await HttpRequest.send(requestOptions);
      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-import-error', error);
    }
  }

  /**
   * Stream export.
   * @param {number} id Register ID.
   * @param {object} params Params.
   * @param {boolean} params.withData With data.
   * @param {boolean} params.file File.
   * @returns {Promise<object>}
   */
  async streamExport(id, { withData, file }) {
    const params = { with_data: withData, file };
    const url = this.getUrlWithQueryParams(`${ROUTES.getRegisters}/${id}/stream-export`, params);

    try {
      const requestOptions = {
        url: url,
        method: HttpRequest.Methods.GET,
        headers: this.generateHeaders(),
      };

      if (file) {
        return requestOptions;
      }
      const response = await HttpRequest.send(requestOptions);

      return response;
    } catch (error) {
      this.handleError('register-request-export-error', error);
    }
  }

  /**
   * Import.
   * @param {object} params Params.
   * @param {boolean} params.clearRecords Clear records.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async streamImport(clearRecords, accessInfo = {}) {
    const url = this.getUrlWithQueryParams(`${ROUTES.getRegisters}/stream-import`, {
      clear_records: clearRecords,
    });
    return {
      url: url,
      method: HttpRequest.Methods.POST,
      headers: this.generateHeaders(accessInfo),
    };
  }

  /**
   * Get records.
   * @param {object} params Params.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @returns {Promise<object[]>}
   */
  async getRecords(params) {
    const url = this.getUrlWithQueryParams(ROUTES.getRecords, {
      ...params,
      allow_see_all_records: true,
    });

    try {
      const response = await HttpRequest.send({
        url: url,
        method: HttpRequest.Methods.GET,
        headers: this.generateHeaders(),
        timeout: this.timeout,
      });

      return response;
    } catch (error) {
      this.handleError('register-request-get-records-error', error);
    }
  }

  /**
   * Find record by ID.
   * @param {string} id Record ID.
   * @returns {Promise<object>}
   */
  async findRecordById(id) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRecords}/${id}`,
        method: HttpRequest.Methods.GET,
        headers: this.generateHeaders(),
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-get-record-by-id-error', error);
    }
  }

  /**
   * Create record.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async createRecord(data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRecords}`,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-post-record-error', error);
    }
  }

  /**
   * Import bulk records.
   * @param {object[]} records Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<ImportBulkRecordsResponse>}
   *
   * @typedef {object} ImportBulkRecordsResponse
   * @property {number} keyRecords
   * @property {number} recordsToImport
   * @property {number} recordsToUpdate
   * @property {number | object[]} importedRecords
   * @property {number} updatedRecords
   * @property {number} updatedRecordsByDataField
   */
  async importBulkRecords({ registerId, keyId, background, isCalculateSearchStrings, isReturnCreatedRecords }, records, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRecords}/bulk`,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: {
          registerId,
          keyId,
          background,
          records,
          isCalculateSearchStrings,
          isReturnCreatedRecords,
        },
        timeout: 2 * this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-post-record-error', error);
    }
  }

  /**
   * Update record by ID.
   * @param {string} id Record ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async updateRecordById(id, data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRecords}/${id}`,
        method: HttpRequest.Methods.PUT,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });
      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-put-record-error', error);
    }
  }

  /**
   * Delete record by ID.
   * @param {string} id Record ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   */
  async deleteRecordById(id, data, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRecords}/${id}`,
        method: HttpRequest.Methods.DELETE,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: data,
        timeout: this.timeout,
      });
      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-delete-record-error', error);
    }
  }

  /**
   * Delete bulk records.
   * @param {object} options Options.
   * @param {object} options.registerId Register ID.
   * @param {object} options.keyId Key ID.
   * @param {string[]} options.skipRecordIds Skip record IDs.
   * @param {object} accessInfo Access info.
   */
  async deleteBulkRecords({ registerId, keyId, skipRecordIds }, accessInfo = {}) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getRecords}/bulk`,
        method: HttpRequest.Methods.DELETE,
        headers: this.generateHeaders(accessInfo),
        json: true,
        body: {
          registerId,
          keyId,
          skipRecordIds,
        },
        timeout: this.timeout,
      });
      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-delete-record-error', error);
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<object>}
   */
  async sendPingRequest() {
    const fullResponse = true;

    try {
      let responseData = await HttpRequest.send(
        {
          url: `${this.server}:${this.port}${ROUTES.pingWithAuth}`,
          method: HttpRequest.Methods.GET,
          headers: {
            token: this.token,
            'x-trace-id': getTraceId(),
          },
        },
        fullResponse,
      );
      log.save('send-ping-request-to-register', responseData);
      const version = responseData && responseData.response && responseData.response.headers && responseData.response.headers.version;
      const customer = responseData && responseData.response && responseData.response.headers && responseData.response.headers.customer;
      const environment = responseData && responseData.response && responseData.response.headers && responseData.response.headers.environment;
      const body = responseData && responseData.response && JSON.parse(responseData.response.body || '{}');
      return { body, version, customer, environment };
    } catch (error) {
      log.save('send-ping-request-to-register-error', error.message);
    }
  }

  /**
   * Reindex by key ID.
   * @param {number} keyId Key ID.
   */
  async reindexByKeyId(keyId) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getKeys}/${keyId}/reindex`,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(),
        json: true,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-post-keys-reindex-error', error);
    }
  }

  /**
   * After handlers reindex by key ID.
   * @param {number} keyId Key ID.
   * @param {object} data Data.
   */
  async afterHandlersReindexByKeyId(keyId, data) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.getKeys}/${keyId}/afterhandlers-reindex`,
        method: HttpRequest.Methods.POST,
        headers: this.generateHeaders(),
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('register-request-post-keys-afterhandlers-reindex-error', error);
    }
  }

  /**
   * Prepare response.
   * @private
   * @param {object} response HTTP Response.
   * @returns {object}
   */
  prepareResponse(response) {
    if (typeof response.data !== 'undefined') {
      return response.data;
    }
  }

  /**
   * Handle error.
   * @private
   * @param {string} logName Log name.
   * @param {object} error Error.
   * @returns {object}
   */
  handleError(logName, error) {
    let message;
    try {
      message = JSON.parse(error.message);
    } catch {
      message = error;
    }

    log.save(logName, message && ((message.error && message.error.message) || message));
    if (message.error && message.error.message) {
      const error = new Error(message.error.message);
      error.details = message.error?.details;
      throw error;
    }

    throw new Error(message);
  }

  /**
   * Get url with query params.
   * @private
   * @param {string} route Route.
   * @param {object} params Params.
   * @returns {string}
   */
  getUrlWithQueryParams(route, params) {
    const queryParamsString = this.queryParamsToString(params);
    let url = `${this.server}:${this.port}${route}`;
    if (queryParamsString) {
      url += `?${queryParamsString}`;
    }

    return url;
  }

  /**
   * Convert object params to string params.
   * @private
   * @param {object} queryParams Query params object.
   * @returns {string}
   */
  queryParamsToString(queryParams) {
    return encodeURI(
      Object.entries(queryParams)
        .filter((value) => typeof value[1] !== 'undefined')
        .map((value) => {
          if (Array.isArray(value[1])) {
            return querystring.stringify({ [value[0]]: value[1] }, null, '[]=');
          } else if (typeof value[1] === 'object') {
            return `${value[0]}=${JSON.stringify(value[1])}`;
          }

          return `${value[0]}=${value[1]}`;
        })
        .join('&'),
    );
  }

  /**
   * Prepare access info.
   * @private
   * @param {object} accessInfo Access info.
   * @returns {string}
   */
  prepareAccessInfo(accessInfo) {
    return Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64');
  }
}

module.exports = RegisterService;
