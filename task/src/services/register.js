
const HttpRequest = require('../lib/http_request');
const { getTraceId } = require('../lib/async_local_storage');

// Constants.
const ROUTES = {
  getRegisters: '/registers',
  getKeys: '/keys',
  getHistoryByKeyId: '/keys/{key-id}/history',
  getHistoryByRecordId: '/records/{record-id}/history',
  getViewingHistory: '/access-log',
  getRecords: '/records',
  getFilteredRecords: '/records/filter',
  ping: '/test/ping',
  pingWithAuth: '/test/ping_with_auth',
  postCode: '/custom/post-code',
  search: '/records/search',
  rollback: '/rollback'
};
const KEY_ID_ANCHOR = '{key-id}';
const RECORD_ID_ANCHOR = '{record-id}';
const OBJECT_TYPE_FILTER_NAMES = ['data', 'data_like', 'sort', 'data_date_from', 'data_date_to'];

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

    log.save('register-request-get-registers');

    const response = await HttpRequest.send({
      url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get registers error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Find register by ID.
   * @param {number} id Register ID.
   * @returns {Promise<object>}
   */
  async findRegisterById(id) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getRegisters}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Find registers by id error. ${response.error.message}`);
    }

    return this.prepareResponse(response);
  }

  /**
   * Get keys.
   * @returns {Promise<object[]>}
   * @param {object} params Params.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   */
  async getKeys(params) {
    const url = this.getUrlWithQueryParams(ROUTES.getKeys, params);

    log.save('register-request-get-keys');

    const response = await HttpRequest.send({
      url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get keys error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Find keys by ID.
   * @param {number} id Key ID.
   * @returns {Promise<object>}
   */
  async findKeyById(id) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getKeys}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Find key by id error. ${response.error.message}`);
    }

    return this.prepareResponse(response);
  }

  /**
   * Search.
   * @param {number} keyId Key ID.
   * @param {string} text Text to search.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object[]>} Records list.
   */
  async search(keyId, text, accessInfo = {}, limit, offset) {
    const limitQuery = Number.isInteger(limit) ? `&limit=${limit}&offset=${offset}` : '';

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.search}?key_id=${keyId}&text=${encodeURIComponent(text)}${limitQuery}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Search records error. ${response.error.message}`);
    }

    return this.prepareResponse(response);
  }

  /**
   * Get history by key ID.
   * @param {number} keyId Key ID.
   * @param {{offset, limit, operation}} params Query params.
   * @returns {Promise<object>}
   */
  async getHistoryByKeyId(keyId, params) {
    const url = this.getUrlWithQueryParams(ROUTES.getHistoryByKeyId.replace(KEY_ID_ANCHOR, keyId), params);
    const response = await HttpRequest.send({
      url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get history by key id error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Get viewing history by key ID.
   * @param {number} keyId Key ID.
   * @param {{offset, limit, created_from, created_to}} params Query params.
   * @returns {Promise<object>}
   */
  async getViewingHistoryByKeyId(keyId, params) {
    const url = this.getUrlWithQueryParams(ROUTES.getViewingHistory, { key_id: keyId, ...params });
    const response = await HttpRequest.send({
      url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get viewing history by key id error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Get history by record ID.
   * @param {number} recordId Record ID.
   * @param {{offset, limit, operation}} params Query params.
   * @returns {Promise<object>}
   */
  async getHistoryByRecordId(recordId, params) {
    const url = this.getUrlWithQueryParams(ROUTES.getHistoryByRecordId.replace(RECORD_ID_ANCHOR, recordId), params);
    const response = await HttpRequest.send({
      url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get history by record id error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Get viewing history by record ID.
   * @param {number} recordId Record ID.
   * @param {{offset, limit, created_from, created_to}} params Query params.
   * @returns {Promise<object>}
   */
  async getViewingHistoryByRecordId(recordId, params) {
    const url = this.getUrlWithQueryParams(ROUTES.getViewingHistory, { record_id: recordId, ...params });
    const response = await HttpRequest.send({
      url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get viewing history by record id error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Get records.
   * @param {object} params Params.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object[]>}
   */
  async getRecords(params, accessInfo = {}) {
    if (typeof params.sort === 'undefined') {
      params.sort = {
        created_at: 'desc'
      };
    }

    const url = this.getUrlWithQueryParams(ROUTES.getRecords, params);

    const response = await HttpRequest.send({
      url: url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get records error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Get filtered records.
   * @param {object} params Params.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @param {object} [body] Request body
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<Object>}
   */
  async getFilteredRecords(params, body = {}, accessInfo = {}) {
    const url = this.getUrlWithQueryParams(ROUTES.getFilteredRecords, params);

    const requestOptions = {
      url: url,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      body: JSON.stringify(body),
      timeout: this.timeout
    };
    const response = await HttpRequest.send(requestOptions);

    if (response.error) {
      throw new Error(`Internal error. Get filtered records error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Find record by ID.
   * @param {string} id Record ID.
   * @param {object} options Options.
   * @param {{systemId, userId, userName, orgName, position, remarks}} options.accessInfo Access info.
   * @returns {Promise<object[]>}
   */
  async findRecordById(id, accessInfo = {}) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getRecords}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Find record by id error. ${response.error.message}`);
    }

    return this.prepareResponse(response);
  }

  /**
   * Create record.
   * @param {object} data Data.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   */
  async createRecord(data, accessInfo = {}) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getRecords}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      json: true,
      body: data,
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Create record. ${response.error.message}`);
    }

    return this.prepareResponse(response);
  }

  /**
   * Update record by ID.
   * @param {string} id Record ID.
   * @param {object} data Data.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   */
  async updateRecordById(id, data, accessInfo = {}) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getRecords}/${id}`,
      method: HttpRequest.Methods.PUT,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      json: true,
      body: data,
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Update record by id error. ${response.error.message}`);
    }

    return this.prepareResponse(response);
  }

  /**
   * Delete record by ID.
   * @param {string} id Record ID.
   * @param {object} person Person.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   */
  async deleteRecordById(id, person, accessInfo = {}) {
    const personQuery = person && person.id && person.name ? `?personId=${encodeURI(person.id)}&personName=${encodeURI(person.name)}` : '';

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getRecords}/${id}${personQuery}`,
      method: HttpRequest.Methods.DELETE,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Delete record by id error. ${response.error.message}`);
    }

    return this.prepareResponse(response);
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
    } else if (typeof response.error !== 'undefined') {
      throw new Error(JSON.stringify(response.error.message));
    }
  }

  /**
   * Get url with query params.
   * @private
   * @param {string} route Route.
   * @param {object} params Params.
   * @returns {string}
   */
  getUrlWithQueryParams(route, params) {
    let url = `${this.server}:${this.port}${route}`;

    const queryParamsString = params ? this.queryParamsToString(params) : '';
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
    const isEmpty = (value) => {
      const isEmptyObject = typeof value === 'object' && Object.keys(value).length === 0;
      return typeof value === 'undefined' || value === null || isEmptyObject;
    };

    return encodeURI(
      Object.entries(queryParams)
        .filter(([, value]) => !isEmpty(value))
        .map((value) => {
          if (typeof value[1] === 'object' && OBJECT_TYPE_FILTER_NAMES.includes(value[0])) {
            return Object.keys(value[1]).map(key => `${value[0]}[${key}]=${value[1][key]}`).join('&');
          }

          if (Array.isArray(value[1])) {
            return value[1].map(item => `${value[0]}[]=${item}`).join('&');
          } else if (typeof value[1] === 'object') {
            return `${value[0]}=${JSON.stringify(value[1])}`;
          }

          return `${value[0]}=${value[1]}`;
        })
        .join('&')
    );
  }

  /**
   * Send ping request.
   * @returns {Promise<object>}
   */
  async sendPingRequest() {
    try {
      const fullResponse = true;

      let responseData = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.pingWithAuth}`,
        method: HttpRequest.Methods.GET,
        headers: {
          'x-trace-id': getTraceId(),
          token: this.token,
        }
      }, fullResponse);
      log.save('send-ping-request-to-register', responseData);
      const body = responseData && responseData.body;
      const headers = responseData && responseData.response && responseData.response.headers;
      const version = headers && headers.version;
      const customer = headers && headers.customer;
      const environment = headers && headers.environment;
      return { version, customer, environment, body };
    } catch (error) {
      log.save('send-ping-request-to-register', error.message);
    }
  }

  /**
   * Get post codes.
   * @param {object} params Params.
   * @returns {Promise<object[]>}
   */
  async getPostCodeInfo(params) {
    const url = this.getUrlWithQueryParams(ROUTES.postCode, params);

    const response = await HttpRequest.send({
      url: url,
      method: HttpRequest.Methods.GET,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get post code info error. ${response.error.message}`);
    }

    return response;
  }

  /**
   * Delete register cache.
   * @return {Promise<number>}
   */
  async deleteCache() {
    if (global.redisClient) {
      return await global.redisClient.deleteMany('bpmn-register.key.*');
    }

    // Return default count if Redis disabled.
    return 0;
  }

  /**
   * Start rollback.
   * @param {object} rollbackOption.
   * @param {integer} rollbackOption.keyId Key ID.
   * @param {string} rollbackOption.timePoint Time point.
   * @param {object} accessOption.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessOption.accessInfo Access info.
   */
  async startRollback({ keyId, timePoint }, { accessInfo = {} }) {
    const data = {
      keyId,
      timePoint
    };

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.rollback}/start`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      json: true,
      body: data,
      timeout: this.timeout
    });

    if (response.error) {
      const error = new Error('Internal error. Start rollback error.');
      error.details = response.error.details;
      throw error;
    }

    return this.prepareResponse(response);
  }

  async getRollbackStatusWithDetails(rollbackId) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.rollback}/${rollbackId}/status`,
      method: HttpRequest.Methods.GET,
      headers: {
        token: this.token,
        'x-trace-id': getTraceId(),
      },
      timeout: this.timeout
    });

    if (response.error) {
      throw new Error(`Internal error. Get rollback status error. ${response.error.message}`);
    }
    return this.prepareResponse(response);
  }

  /**
   * Rollback one record.
   * @param {object} rollbackRecordOptions.
   * @param {string} rollbackRecordOptions.historyId History ID.
   * @param {string} rollbackRecordOptions.recordId Record ID.
   * @param {integer} rollbackRecordOptions.keyId Key ID.
   * @param {object} accessOption.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessOption.accessInfo Access info.
   * @returns {Promise<object>}
   */
  async rollbackRecord({ historyId, recordId, keyId }, { accessInfo }) {
    const data = { historyId, recordId, keyId };

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.rollback}/record`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        'x-trace-id': getTraceId(),
        token: this.token,
        'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64')
      },
      json: true,
      body: data,
      timeout: this.timeout
    });

    if (response.error) {
      const error = new Error('Internal error. Rollback record error.');
      error.details = response.error.details;
      throw error;
    }

    return this.prepareResponse(response);
  }

}

module.exports = RegisterService;
