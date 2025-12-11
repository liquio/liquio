const axios = require('axios');

const { prepareAxiosErrorToLog } = require('../../../../lib/helpers');
const HttpRequest = require('../../../../lib/http_request');

// Constants.
const ID_CARD_LENGTH = 9;

/**
 * Services repository requester.
 */
class ServicesRepositoryRequester {
  constructor(config) {
    // Define singleton.
    if (!ServicesRepositoryRequester.singleton) {
      this.config = config;
      const { url, apiMethods, token, timeout = 20000 } = config || {};
      this.url = url;
      this.apiMethods = apiMethods || {};
      this.token = token;
      this.timeout = timeout;
      ServicesRepositoryRequester.singleton = this;
    }
    return ServicesRepositoryRequester.singleton;
  }

  /**
   * Save to services repository.
   * @param {object} data Data.
   */
  async save(data) {
    const { userIpn, requestId, serviceName, repositoryServiceId, statusId, statusComment } = data;

    if (!repositoryServiceId && statusId) {
      return;
    }

    if (!repositoryServiceId) {
      // Check if all params exist to create new service request in repository.
      if (!userIpn || !requestId || !serviceName) {
        throw new Error('Required params for repository are undefined.');
      }

      return await this.createRequestToOrderService(userIpn, requestId, serviceName);
    }

    // Change service request status.
    if (!statusId || !statusComment) {
      throw new Error('Required params to change service request status are undefined.');
    }
    return await this.changeRequestStatus(repositoryServiceId, statusId, statusComment);
  }

  /**
   * Create request to order service.
   * @param {string} userIpn User ipn.
   * @param {string} requestId Request Id.
   * @param {string} serviceName Service name.
   */
  async createRequestToOrderService(userIpn, requestId, serviceName) {
    // Define service Id in regisrty.
    const { serviceIdsMap } = this.config;
    const serviceId = serviceIdsMap && serviceIdsMap[serviceName];
    if (!serviceIdsMap || !serviceId) {
      throw new Error('Can\'t get repository services IDs to define service.');
    }

    // Check if passport in ipn field.
    let body;
    if (userIpn) {
      body =
        this.isPassport(userIpn) || userIpn.length === ID_CARD_LENGTH
          ? {
            public_service_identifier: serviceId,
            service_foreign_id: requestId,
            client_passport: userIpn,
          }
          : {
            public_service_identifier: serviceId,
            service_foreign_id: requestId,
            client_inn: userIpn,
          };
    }

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.createServiceRequest}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token,
      },
      data: body,
      timeout: this.timeout,
    };
    log.save('create-request-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      log.save('create-request-in-services-repository|response', { requestOptions, response, body });
    } catch (error) {
      log.save(
        'create-request-in-services-repository|exception',
        {
          ...prepareAxiosErrorToLog(error),
          body,
        },
        'error',
      );
      throw error;
    }

    return response;
  }

  /**
   * Change request status.
   * @param {string} repositoryRequestId Repository request Id.
   * @param {number} serviceStatusId Service status Id.
   * @param {string} serviceStatusComment Service status comment.
   */
  async changeRequestStatus(repositoryRequestId, serviceStatusId, serviceStatusComment) {
    // Define payload.
    const body = {
      service_id: repositoryRequestId,
      service_status: serviceStatusId,
      service_status_comment: serviceStatusComment,
    };

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.createServiceStatus}`,
      method: HttpRequest.Methods.POST,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token,
      },
      data: body,
      timeout: this.timeout,
    };
    log.save('change-status-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      log.save('change-status-in-services-repository|response', { requestOptions, response, body });
    } catch (error) {
      log.save(
        'create-status-in-services-repository|exception',
        {
          ...prepareAxiosErrorToLog(error),
          body,
        },
        'error',
      );
      throw error;
    }

    return response;
  }

  /**
   * Get request to order service.
   * @param {string} userIpn User ipn.
   * @param {string} repositoryRequestId Repository request ID.
   */
  async getRequestToOrderService(userIpn, repositoryRequestId) {
    if (!userIpn || !repositoryRequestId) {
      throw new Error('Required params to send with are undefined.');
    }

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.getServiceRequest}${userIpn}/${repositoryRequestId}`,
      method: HttpRequest.Methods.GET,
      headers: {
        Authorization: this.token,
      },
      timeout: this.timeout,
    };
    log.save('get-request-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      log.save('get-request-in-services-repository|response', { requestOptions, response, userIpn, repositoryRequestId });
    } catch (error) {
      log.save('get-request-in-services-repository|exception', { ...prepareAxiosErrorToLog(error), userIpn, repositoryRequestId });
      throw error;
    }

    return response;
  }

  /**
   * Get request current status.
   * @param {string} statusId Status id.
   */
  async getRequestStatus(statusId) {
    if (!statusId) {
      throw new Error('Required params to send with are undefined.');
    }

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.getServiceStatus}${statusId}`,
      method: HttpRequest.Methods.GET,
      headers: {
        Authorization: this.token,
      },
      timeout: this.timeout,
    };
    log.save('get-request-status-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      log.save('get-request-status-in-services-repository|response', { requestOptions, response, statusId });
    } catch (error) {
      log.save('create-request-status-in-services-repository|exception', { ...prepareAxiosErrorToLog(error), statusId });
      throw error;
    }

    return response;
  }

  /**
   * Get all user ordered services.
   * @param {string} userIpn User ipn.
   */
  async getAllUserOrderedServices(userIpn) {
    if (!userIpn) {
      throw new Error('Required params to send with are undefined.');
    }

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.getAllUserServices}${userIpn}`,
      method: HttpRequest.Methods.GET,
      headers: {
        Authorization: this.token,
      },
      timeout: this.timeout,
    };
    log.save('get-all-user-services-from-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      log.save('get-all-user-services-from-repository|response', { requestOptions, response, userIpn });
    } catch (error) {
      log.save('get-all-user-services-from-repository|exception', { ...prepareAxiosErrorToLog(error), userIpn });
      throw error;
    }

    return response;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.checkHealth}`,
      method: HttpRequest.Methods.GET,
      timeout: this.timeout,
    };

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      log.save('send-ping-request-to-services-repository', response);
    } catch (error) {
      log.save('send-ping-request-to-services-repository', prepareAxiosErrorToLog(error), 'error');
    }
    return JSON.parse(response);
  }

  /**
   * @private
   * Check if passport.
   * @param userIpn User ipn.
   * @returns {boolean}
   */
  isPassport(userIpn) {
    return /^[А-ЯЇЄІЙ]{2}\d{6}/.test(userIpn);
  }
}

module.exports = ServicesRepositoryRequester;
