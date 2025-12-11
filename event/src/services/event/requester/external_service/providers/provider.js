const { ERROR_OVERRIDE } = require('../../../../../constants/error');
const { InvalidConfigError } = require('../../../../../lib/errors');
const Sandbox = require('../../../../../lib/sandbox');

/**
 * Provider.
 */
class Provider {
  constructor() {
    this.apiTypes = {
      TREMBITA_SOAP_API: 'TREMBITA_SOAP_API',
      TREMBITA_REST_API_V1: 'TREMBITA_REST_API_V1',
      TREMBITA_REST_API_V2: 'TREMBITA_REST_API_V2',
    };
    this.sandbox = Sandbox.getInstance();
    this.httpClient = global.httpClient;
  }

  /**
   * Send.
   * @abstract
   * @param {object} dataToSend Data.
   */
  // eslint-disable-next-line no-unused-vars
  async send(dataToSend) {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Prepare log type name.
   * @private
   * @param {string} type Log type.
   * @param {boolean} ping Ping.
   * @param {string} method Method - caller.
   */
  prepareLogType(type, ping = false, method = '') {
    return `${type}${ping ? '-ping' : ''}${method ? `-${method}` : ''}`;
  }

  /**
   * @see https://192.168.60.151:4000/docs/uk/uxp-ug-ss_uxp_security_server_user_guide.html#SOASER-42
   * @param {Object} serviceConfig Specific service config
   * @param {string} [requestId] Request ID
   * @return {{url: string, client: {xRoadInstance: string, memberClass: string, memberCode: string, subsystemCode: string }, service: {xRoadInstance: string, memberClass: string, memberCode: string, subsystemCode: string, serviceCode: string}, id: string, protocolVersion: string, userId: string}}
   */
  static getTrembitaSoapApiParams(serviceConfig, requestId, trembitaConfig) {
    const {
      host,
      client,
      id: defaultRequestId,
      protocolVersion: defaultProtocolVersion,
      userId: defaultUserId,
    } = trembitaConfig || global.config.trembita || {};

    const id = requestId || defaultRequestId;
    const protocolVersion = serviceConfig?.protocolVersion || defaultProtocolVersion;
    const userId = serviceConfig?.userId || defaultUserId;

    if (!host || !client || !id || !protocolVersion || !userId) {
      throw new InvalidConfigError('getTrembitaSoapApiParams. Invalid trembita.json config.');
    }

    if (
      !serviceConfig?.xRoadInstance ||
      !serviceConfig?.memberClass ||
      !serviceConfig?.memberCode ||
      !serviceConfig?.subsystemCode ||
      !serviceConfig?.serviceCode
    ) {
      throw new InvalidConfigError('getTrembitaSoapApiParams. Invalid requester.json serviceConfig.');
    }

    return {
      url: host,
      client,
      service: serviceConfig,
      id,
      protocolVersion,
      userId,
    };
  }

  /**
   * @see https://192.168.60.151:4000/docs/uk/uxp-ug-ss_uxp_security_server_user_guide.html#RF-02
   * @param {Object} serviceConfig Specific service config
   * @return {{url: string}}
   */
  static getTrembitaRestApiV1Params(serviceConfig) {
    const { host, client, protocolVersion: defaultProtocolVersion } = global.config.trembita || {};

    const protocolVersion = serviceConfig?.protocolVersion || defaultProtocolVersion;

    if (!host || !client || !protocolVersion) {
      throw new InvalidConfigError('getTrembitaRestApiV1Params. Invalid trembita.json config.');
    }

    if (
      !serviceConfig?.xRoadInstance ||
      !serviceConfig?.memberClass ||
      !serviceConfig?.memberCode ||
      !serviceConfig?.subsystemCode ||
      !serviceConfig?.serviceCode ||
      !serviceConfig?.serviceVersion
    ) {
      throw new InvalidConfigError('getTrembitaRestApiV1Params. Invalid requester.json serviceConfig.');
    }

    return {
      url: `${host}/restapi/${client.memberClass}/${client.memberCode}/${client.subsystemCode}/${protocolVersion}/rpc?xRoadInstance=${serviceConfig.xRoadInstance}&memberClass=${serviceConfig.memberClass}&memberCode=${serviceConfig.memberCode}&subsystemCode=${serviceConfig.subsystemCode}&serviceCode=${serviceConfig.serviceCode}&serviceVersion=${serviceConfig.serviceVersion}`,
    };
  }

  /**
   * @see https://192.168.60.151:4000/docs/uk/uxp-ug-ss_uxp_security_server_user_guide.html#RF-07
   * @param {Object} serviceConfig Specific service config
   * @return {{url: string, headers: {'Uxp-client': string, 'Uxp-service': string}}}
   */
  static getTrembitaRestApiV2Params(serviceConfig) {
    const { host, client, protocolVersion: defaultProtocolVersion } = global.config.trembita || {};

    const protocolVersion = serviceConfig?.protocolVersion || defaultProtocolVersion;

    if (!host || !client || !protocolVersion) {
      throw new InvalidConfigError('getTrembitaRestApiV2Params. Invalid trembita.json config.');
    }

    if (!serviceConfig?.uxpService) {
      throw new InvalidConfigError('getTrembitaRestApiV2Params. Invalid requester.json serviceConfig, uxpService required.');
    }

    return {
      url: `${host}/restapi${serviceConfig.route || ''}`,
      headers: {
        'Uxp-client': `${client.xRoadInstance}/${client.memberClass}/${client.memberCode}/${client.subsystemCode}`,
        'Uxp-service': serviceConfig.uxpService,
      },
    };
  }
}

module.exports = Provider;
