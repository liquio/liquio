const fs = require('fs');
const axios = require('axios');

const Provider = require('./provider');

// Constants.
const TREMBITA_TEMPLATE = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xro="http://x-road.eu/xsd/xroad.xsd" xmlns:iden="http://x-road.eu/xsd/identifiers">
<soapenv:Header>
  <xro:client iden:objectType="{header.client.objectType}">
    <iden:xRoadInstance>{header.client.xRoadInstance}</iden:xRoadInstance>
    <iden:memberClass>{header.client.memberClass}</iden:memberClass>
    <iden:memberCode>{header.client.memberCode}</iden:memberCode>
    <iden:subsystemCode>{header.client.subsystemCode}</iden:subsystemCode>
  </xro:client>
  <xro:service iden:objectType="{header.service.objectType}">
    <iden:xRoadInstance>{header.service.xRoadInstance}</iden:xRoadInstance>
    <iden:memberClass>{header.service.memberClass}</iden:memberClass>
    <iden:memberCode>{header.service.memberCode}</iden:memberCode>
    <iden:subsystemCode>{header.service.subsystemCode}</iden:subsystemCode>
    <iden:serviceCode>{header.service.serviceCode}</iden:serviceCode>
  </xro:service>
  <xro:protocolVersion>{header.protocolVersion}</xro:protocolVersion>
</soapenv:Header>
<soapenv:Body>
  <BPMN>
    <workflowId>{body.workflowId}</workflowId>
    <documentId>{body.documentId}</documentId>
    <data>{body.data}</data>
    <fileP7s>{body.fileP7s}</fileP7s>
  </BPMN>
</soapenv:Body>
</soapenv:Envelope>`;

/**
 * Standard trembita provider.
 * @extends Provider
 */
class StandardTrembitaProvider extends Provider {
  /**
   * Standard trembita provider constructor.
   * @param {object} config Config.
   * @param {string} config.url API URL.
   * @param {{sendDocument}} config.apiMethods API methods.
   * @param {string} config.token Request auth token.
   */
  constructor(config) {
    // Define singleton.
    if (!StandardTrembitaProvider.singleton) {
      super();
      this.config = config;
      const { providersConfigPath } = config || {};
      if (providersConfigPath) {
        ({ externalServiceDiscovery: this.externalServiceDiscovery } = this.getProvidersConfig(providersConfigPath));
      }
      StandardTrembitaProvider.singleton = this;
    }
    return StandardTrembitaProvider.singleton;
  }

  /**
   * Send.
   * @param {object} data Data.
   * @param {{workflowId, documentId, data, fileP7s}} data.body Object to send.
   * @param {{service}} data.destination Destination service.
   * @param {boolean} isTest Is test response.
   */
  async send(data, isTest = false) {
    // Define body and destination service params.
    const { body, destination } = data;
    const { service } = destination;
    const { trembitaUrl, trembitaHeader, requestHeaders, requestTimeout, retriesAfter } = this.getProviderConfig(service);

    // Trembita SOAP message container.
    let soapMessage = TREMBITA_TEMPLATE;

    // Define Trembita header.
    soapMessage = soapMessage
      .replace('{header.client.objectType}', trembitaHeader.client.objectType)
      .replace('{header.client.xRoadInstance}', trembitaHeader.client.xRoadInstance)
      .replace('{header.client.memberClass}', trembitaHeader.client.memberClass)
      .replace('{header.client.memberCode}', trembitaHeader.client.memberCode)
      .replace('{header.client.subsystemCode}', trembitaHeader.client.subsystemCode)
      .replace('{header.service.objectType}', trembitaHeader.service.objectType)
      .replace('{header.service.xRoadInstance}', trembitaHeader.service.xRoadInstance)
      .replace('{header.service.memberClass}', trembitaHeader.service.memberClass)
      .replace('{header.service.memberCode}', trembitaHeader.service.memberCode)
      .replace('{header.service.subsystemCode}', trembitaHeader.service.subsystemCode)
      .replace('{header.service.serviceCode}', trembitaHeader.service.serviceCode)
      .replace('{header.service.serviceVersion}', trembitaHeader.service.serviceVersion)
      .replace('{header.protocolVersion}', trembitaHeader.protocolVersion);

    // Define Trembita body.
    const bodyWorkflowId = body.workflowId;
    const bodyDocumentId = body.documentId;
    const bodyData = Buffer.from(JSON.stringify(body.data), 'utf8').toString('base64');
    const bodyFileP7s = (body.fileP7s && Buffer.from(body.fileP7s, 'utf8').toString('base64')) || '';
    soapMessage = soapMessage
      .replace('{body.workflowId}', bodyWorkflowId)
      .replace('{body.documentId}', bodyDocumentId)
      .replace('{body.data}', bodyData)
      .replace('{body.fileP7s}', bodyFileP7s);

    // Request options.
    const requestOptions = {
      url: trembitaUrl,
      method: 'POST',
      headers: requestHeaders,
      data: soapMessage,
      timeout: requestTimeout,
    };
    log.save('send-to-standard-trembita-provider|request-options', { requestOptions });

    // Do request.
    let response;
    let errors = [];
    try {
      const retriesAfterWithStartNow = [0, ...retriesAfter];
      for (const retryAfter of retriesAfterWithStartNow) {
        try {
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          response = (await axios(requestOptions)).data;
          log.save('send-to-standard-trembita-provider|response', { requestOptions, response, data });
          break;
        } catch (error) {
          errors.push(error);
        }
      }
      if (!response) {
        throw new Error(errors.map((e) => e && e.message).join('|'));
      }
    } catch (error) {
      log.save('send-to-standard-trembita-provider|all|exception', { error: error && error.message, data });
      throw error;
    }
    if (isTest) {
      return response;
    }
    const errorToSavePositionStrat = response.indexOf('<error>') !== -1 ? response.indexOf('<error>') + 7 : response.indexOf('<error>');
    const errorToSavePositionEnd = response.indexOf('</error>');
    const dataToSavePositionStrat = response.indexOf('<data>') !== -1 ? response.indexOf('<data>') + 6 : response.indexOf('<data>');
    const dataToSavePositionEnd = response.indexOf('</data>');
    const externalIdToSavePositionStrat = response.indexOf('<id>') !== -1 ? response.indexOf('<id>') + 4 : response.indexOf('<id>');
    const externalIdToSavePositionEnd = response.indexOf('</id>');
    const isDone =
      [errorToSavePositionStrat, errorToSavePositionEnd].every((v) => v === -1) &&
      [dataToSavePositionStrat, dataToSavePositionEnd, externalIdToSavePositionStrat, externalIdToSavePositionEnd].every((v) => v !== -1);
    if (!isDone) {
      throw new Error(response);
    }

    // Append external ID.
    const externalIdToSave =
      externalIdToSavePositionStrat !== -1 && response.substring(externalIdToSavePositionStrat, externalIdToSavePositionEnd).trim();
    if (typeof response === 'object') {
      response.externalIdToSave = externalIdToSave;
    }

    // Return response with defined external ID.
    return response;
  }

  /**
   * Get providers config.
   * @private
   * @param {string} providersConfigPath Providers config path.
   * @returns {object} Providers config.
   */
  getProvidersConfig(providersConfigPath) {
    let providersConfig;
    try {
      const providersConfigData = fs.readFileSync(providersConfigPath, { encoding: 'utf8' });
      providersConfig = JSON.parse(providersConfigData);
    } catch (error) {
      log.save('standard-trembita-providers-config-definition-error', { error: error && error.message, providersConfigPath });
    }
    return providersConfig;
  }

  /**
   * Get provider config.
   * @param {string} service Destination service.
   * @returns {{trembitaUrl, trembitaHeader: {client: {objectType, xRoadInstance, memberClass, memberCode, subsystemCode}, service: {objectType, xRoadInstance, memberClass, memberCode, subsystemCode, serviceCode, serviceVersion}}, requestHeaders, requestTimeout, retriesAfter}} Provider config.
   */
  getProviderConfig(service) {
    if (!this.externalServiceDiscovery) {
      throw new Error('External service discovery disabled.');
    }
    if (!this.externalServiceDiscovery[service]) {
      throw new Error('External service discovery not contain information about needed service.');
    }
    return this.externalServiceDiscovery[service];
  }
}

// Exports.
module.exports = StandardTrembitaProvider;
