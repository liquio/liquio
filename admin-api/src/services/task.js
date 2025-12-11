const querystring = require('querystring');

const AppInfo = require('../lib/app_info');
const HttpRequest = require('../lib/http_request');
const { getTraceId } = require('../lib/async_local_storage');

// Constants.
const ROUTES = {
  getWorkflowLogs: '/workflow-logs',
  getWorkflowsByElastic: '/workflows/elastic-filtered',
  unitAccess: '/unit-access',
  deleteRegisterCache: '/register/cache',
  ping: '/test/ping',
  pingServices: '/test/ping/services?full=true',
};

/**
 * Task service.
 */
class TaskService {
  /**
   * Register constructor.
   */
  constructor() {
    // Define singleton.
    if (!TaskService.singleton) {
      this.server = config.task.server;
      this.port = config.task.port;
      this.token = config.task.token;
      this.timeout = config.task.timeout || 15000;
      this.appInfo = new AppInfo();

      TaskService.singleton = this;
    }

    // Return singleton.
    return TaskService.singleton;
  }

  get headers() {
    return {
      'x-trace-id': getTraceId(),
      'x-trace-service': this.appInfo.name,
    };
  }

  /**
   * Get workflows by elastic.
   * @param {object} params Params.
   * @returns {Promise<object[]>}
   */
  async getWorkflowsByElastic(params) {
    const query = this.queryParamsToString(params);

    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getWorkflowsByElastic}?${query}`,
      method: HttpRequest.Methods.GET,
      headers: {
        ...this.headers,
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        Authorization: this.token,
      },
      timeout: this.timeout,
    });

    log.save('task-service-elastic-response', response);

    return response;
  }

  /**
   * Get workflow logs by workflow ID.
   * @param {object} params Params.
   * @param {number} params.parentId Parent ID.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @returns {Promise<object[]>}
   */
  async getWorkflowLogsByWorkflowId(id, token) {
    const response = await HttpRequest.send({
      url: `${this.server}:${this.port}${ROUTES.getWorkflowLogs}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: {
        ...this.headers,
        'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
        token: token,
      },
      timeout: this.timeout,
    });

    return response;
  }

  /**
   * Get unit access.
   * @param {object} params Params.
   * @returns {Promise<object[]>}
   */
  async getUnitAccess(params) {
    try {
      const query = this.queryParamsToString(params);

      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.unitAccess}?${query}`,
        method: HttpRequest.Methods.GET,
        headers: {
          ...this.headers,
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          Authorization: this.token,
        },
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('task-request-get-unit-access-error', error);
    }
  }

  /**
   * Find unit access by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findUnitAccessById(id) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.unitAccess}/${id}`,
        method: HttpRequest.Methods.GET,
        headers: {
          ...this.headers,
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          Authorization: this.token,
        },
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('task-request-find-unit-access-error', error);
    }
  }

  /**
   * Create unit access.
   * @param {object} data Date.
   * @returns {Promise<object>}
   */
  async createUnitAccess(data) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.unitAccess}`,
        method: HttpRequest.Methods.POST,
        headers: {
          ...this.headers,
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          Authorization: this.token,
        },
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('task-request-post-unit-access-error', error);
    }
  }

  /**
   * Update unit access by ID.
   * @param {number} id ID.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async updateUnitAccessById(id, data) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.unitAccess}/${id}`,
        method: HttpRequest.Methods.PUT,
        headers: {
          ...this.headers,
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          Authorization: this.token,
        },
        json: true,
        body: data,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('task-request-put-unit-access-error', error);
    }
  }

  /**
   * Delete unit access by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async deleteUnitAccessById(id) {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.unitAccess}/${id}`,
        method: HttpRequest.Methods.DELETE,
        headers: {
          ...this.headers,
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          Authorization: this.token,
        },
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('task-request-delete-unit-access-error', error);
    }
  }

  /**
   * Delete register cache.
   * @returns {Promise<Object>}
   */
  async deleteRegisterCache() {
    try {
      const response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.deleteRegisterCache}`,
        method: HttpRequest.Methods.DELETE,
        headers: {
          ...this.headers,
          'Content-Type': HttpRequest.ContentTypes.CONTENT_TYPE_JSON,
          Authorization: this.token,
        },
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      this.handleError('task-request-delete-register-cache-error', error);
    }
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
          url: `${this.server}:${this.port}${ROUTES.ping}`,
          method: HttpRequest.Methods.GET,
          headers: { ...this.headers },
        },
        fullResponse,
      );
      log.save('send-ping-request-to-bpmn-task-id', responseData);

      const version = responseData && responseData.response && responseData.response.headers && responseData.response.headers.version;
      const customer = responseData && responseData.response && responseData.response.headers && responseData.response.headers.customer;
      const environment = responseData && responseData.response && responseData.response.headers && responseData.response.headers.environment;
      const body = responseData && responseData.response && JSON.parse(responseData.response.body || '{}');
      return { version, body, customer, environment };
    } catch (error) {
      log.save('send-ping-request-to-bpmn-task-error', error.message);
    }
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async pingServices() {
    try {
      let response = await HttpRequest.send({
        url: `${this.server}:${this.port}${ROUTES.pingServices}`,
        method: HttpRequest.Methods.GET,
        headers: { ...this.headers },
      });
      log.save('task-request-send-ping-services', response);

      return response;
    } catch (error) {
      log.save('task-request-send-ping-services-error', error.message);
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
      throw new Error(message.error.message);
    }

    throw new Error(message);
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
          } else if (typeof value[1] === 'object' && value[0] === 'filters') {
            return Object.keys(value[1])
              .map(function (key) {
                return `filters[${key}]=${value[1][key]}`;
              })
              .join('&');
          } else if (typeof value[1] === 'object' && value[0] === 'sort') {
            return Object.keys(value[1])
              .map(function (key) {
                return `sort[${key}]=${value[1][key]}`;
              })
              .join('&');
          } else if (typeof value[1] === 'object') {
            return `${value[0]}=${JSON.stringify(value[1])}`;
          }

          return `${value[0]}=${value[1]}`;
        })
        .join('&'),
    );
  }
}

module.exports = TaskService;
