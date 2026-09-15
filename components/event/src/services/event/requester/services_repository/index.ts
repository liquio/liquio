import axios from 'axios';

import { Helpers } from '../../../../lib/helpers';
const { prepareAxiosErrorToLog } = Helpers;
import { HttpRequest } from '../../../../lib/http_request';

// Constants.
const ID_CARD_LENGTH = 9;

/**
 * Services repository requester.
 */
export class ServicesRepositoryRequester {
  static singleton: ServicesRepositoryRequester;

  config: any;
  url: any;
  apiMethods: Record<string, string>;
  token: any;
  timeout: number;

  constructor(config: any) {
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
  async save(data: any): Promise<any> {
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
  async createRequestToOrderService(userIpn: string, requestId: string, serviceName: string): Promise<any> {
    // Define service Id in regisrty.
    const { serviceIdsMap } = this.config;
    const serviceId = serviceIdsMap && serviceIdsMap[serviceName];
    if (!serviceIdsMap || !serviceId) {
      throw new Error("Can't get repository services IDs to define service.");
    }

    // Check if passport in ipn field.
    let body: any;
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
    global.log.save('create-request-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      global.log.save('create-request-in-services-repository|response', { requestOptions, response, body });
    } catch (error) {
      global.log.save(
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
  async changeRequestStatus(repositoryRequestId: string, serviceStatusId: number, serviceStatusComment: string): Promise<any> {
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
    global.log.save('change-status-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      global.log.save('change-status-in-services-repository|response', { requestOptions, response, body });
    } catch (error) {
      global.log.save(
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
  async getRequestToOrderService(userIpn: string, repositoryRequestId: string): Promise<any> {
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
    global.log.save('get-request-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      global.log.save('get-request-in-services-repository|response', { requestOptions, response, userIpn, repositoryRequestId });
    } catch (error) {
      global.log.save('get-request-in-services-repository|exception', { ...prepareAxiosErrorToLog(error), userIpn, repositoryRequestId });
      throw error;
    }

    return response;
  }

  /**
   * Get request current status.
   * @param {string} statusId Status id.
   */
  async getRequestStatus(statusId: string): Promise<any> {
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
    global.log.save('get-request-status-in-services-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      global.log.save('get-request-status-in-services-repository|response', { requestOptions, response, statusId });
    } catch (error) {
      global.log.save('create-request-status-in-services-repository|exception', { ...prepareAxiosErrorToLog(error), statusId });
      throw error;
    }

    return response;
  }

  /**
   * Get all user ordered services.
   * @param {string} userIpn User ipn.
   */
  async getAllUserOrderedServices(userIpn: string): Promise<any> {
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
    global.log.save('get-all-user-services-from-repository|request-options', { requestOptions });

    // Do request.
    let response;
    try {
      response = (await axios(requestOptions)).data;
      global.log.save('get-all-user-services-from-repository|response', { requestOptions, response, userIpn });
    } catch (error) {
      global.log.save('get-all-user-services-from-repository|exception', { ...prepareAxiosErrorToLog(error), userIpn });
      throw error;
    }

    return response;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.checkHealth}`,
      method: HttpRequest.Methods.GET,
      timeout: this.timeout,
    };

    // Do request.
    let response: any;
    try {
      response = (await axios(requestOptions)).data;
      global.log.save('send-ping-request-to-services-repository', response);
    } catch (error) {
      global.log.save('send-ping-request-to-services-repository', prepareAxiosErrorToLog(error), 'error');
    }
    return JSON.parse(response);
  }

  /**
   * @private
   * Check if passport.
   * @param userIpn User ipn.
   * @returns {boolean}
   */
  isPassport(userIpn: string): boolean {
    return /^[А-ЯЇЄІЙ]{2}\d{6}/.test(userIpn);
  }
}
