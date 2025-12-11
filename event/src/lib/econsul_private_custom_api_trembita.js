const qs = require('qs');
const axios = require('axios');

// Constants.
const ROUTES = {
  'get-applicant-data': '/get-records/get-applicant-data',
  'get-applicant-visits': '/get-records/get-applicant-visits',
  'get-queue-applicant-visits': '/get-records/get-queue-applicant-visits',
  'get-consuls': '/get-records/get-consuls',
  'get-consuls-services': '/get-records/get-consuls-services',
  'get-countries': '/get-records/get-countries',
  'get-institutions': '/get-records/get-institutions',
  'get-services-and-time': '/get-records/get-services-and-time',
  'get-holidays': '/get-records/get-holidays',
  'bulk-by-person': '/create-records/bulk-by-person',
};

/**
 * eConsulPrivate Custom-API Trembita service.
 */
class EConsulPrivateCustomApiTrembita {
  /**
   * Register constructor.
   */
  constructor(config) {
    // Define singleton.
    if (!EConsulPrivateCustomApiTrembita.singleton) {
      this.url = config.url;
      this.token = config.token;
      this.timeout = config.requestTimeout || 3000;
      this.requestHeaders = config.requestHeaders;
      this.name = 'event|eConsul-private-custom-api-trembita';

      EConsulPrivateCustomApiTrembita.singleton = this;
    }

    // Return singleton.
    return EConsulPrivateCustomApiTrembita.singleton;
  }

  /**
   * Get records.
   * @returns {Promise<object[]>}
   * @param {object} requestQueryParams Params.
   * @param {number} requestQueryParams.key_id Key ID.
   * @param {number} requestQueryParams.limit Limit.
   * @param {boolean} [isDoNotCatchError = false].
   * @param {boolean} [isDisableResponseLog = false].
   * @param {boolean} [isDoNotPrepareResponse = false].
   * @param {Object} [requestBody].
   */
  async getRecords(methodName, { query, body }) {
    const LOG_PREFIX = `${this.name}|get-records|${methodName}`;
    const path = ROUTES[methodName];
    if (!path) {
      throw new Error('Wrong methodName.');
    }
    const queryStringified = qs.stringify(query);
    const requestOptions = {
      url: `${this.url}${path}?${queryStringified}`,
      method: 'POST',
      headers: { ...this.requestHeaders, token: this.token },
      data: body,
      timeout: this.timeout,
    };
    log.save(`${LOG_PREFIX}|get-records|request-options`, requestOptions);

    try {
      const response = (await axios(requestOptions)).data;
      log.save(`${LOG_PREFIX}|get-records|response`, response);
      return this.#prepareResponse(response);
    } catch (error) {
      log.save(`${LOG_PREFIX}|error|cannot-get-records`, error);
      throw error;
    }
  }

  /**
   * @param {Object} body
   * @returns {Promise<*>}
   */
  async bulkCreateByPerson(body) {
    const LOG_PREFIX = `${this.name}|bulk-create-by-person`;
    const requestOptions = {
      url: `${this.url}${ROUTES['bulk-by-person']}`,
      method: 'POST',
      headers: { ...this.requestHeaders, token: this.token },
      data: body,
      timeout: this.timeout,
    };
    log.save(`${LOG_PREFIX}|bulk-create-by-person|request-options`, requestOptions);

    try {
      const response = (await axios(requestOptions)).data;
      log.save(`${LOG_PREFIX}|bulk-create-by-person|response`, response);
      return response.data;
    } catch (error) {
      log.save(`${LOG_PREFIX}|bulk-create-by-person|error`, error);
      throw error;
    }
  }

  /**
   * Prepare response.
   * @private
   * @param {object} response HTTP Response.
   * @returns {object}
   */
  #prepareResponse(response) {
    if (typeof response.data !== 'undefined') {
      return response.data;
    } else if (typeof response.error !== 'undefined') {
      throw new Error(response.error.message);
    }
  }
}

module.exports = EConsulPrivateCustomApiTrembita;
