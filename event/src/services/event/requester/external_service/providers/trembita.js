const xml2js = require('xml2js');
const PropByPath = require('prop-by-path');
const axios = require('axios');

const Provider = require('./provider');
const MAX_LOG_LENGTH = 100e3 - 1000;

/**
 * Trembita provider.
 * @extends Provider
 */
class TrembitaProvider extends Provider {
  /**
   * Constructor.
   * @param {object} config Config.
   * @param {string} config.url API URL.
   * @param {{sendDocument}} config.apiMethods API methods.
   * @param {string} config.token Request auth token.
   */
  constructor(config) {
    // Define singleton.
    if (!TrembitaProvider.singleton) {
      super();

      this.config = config;
      const { trembitaUrl, timeout = 20000, debug = false } = config || {};
      this.url = trembitaUrl;
      this.timeout = timeout;
      this.debug = debug;
      TrembitaProvider.singleton = this;
    }
    return TrembitaProvider.singleton;
  }

  /**
   * Send.
   * @param {object} data Data.
   * @param {{documentTemplateId, workflowId, documentId, soapMessage, createAsicRequestOptions}} data.dataToSend Data to send.
   */
  async send(data) {
    // Get params.
    const { transformedData, service } = data;
    const { workflowId, documentId, soapMessage, soapMessageForLog, sendFileFromEventKeyName, fileIdFromEvent } = transformedData;

    // Get service config.
    const trembitaConfig = this.getTrembitaConfig(service);

    const requestOptions = {
      url: this.url,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: trembitaConfig.serviceConfig.soapAction,
      },
      data: soapMessage,
      timeout: this.timeout,
      requestBodySizeInMB: soapMessage.length / 1000 / 1000,
    };

    const ending = '<...cut>';
    const soapMessageCutToLog = soapMessage.length > MAX_LOG_LENGTH ? soapMessage.substring(0, MAX_LOG_LENGTH - ending.length) + ending : soapMessage;

    log.save('send-to-trembita|request-options', {
      requestOptions: {
        ...requestOptions,
        data: this.debug ? soapMessageCutToLog : soapMessageForLog,
      },
      sendFileFromEventKeyName: sendFileFromEventKeyName || '',
      fileIdFromEvent,
      workflowId,
      documentId,
    });

    // Do request.
    const { data: response } = await axios(requestOptions);
    log.save('send-to-trembita|response', { response });

    // Check external service response.
    const responseSoapMessage = await this.prepareResponseSoapMessage(response);

    let parsedResponse;
    try {
      parsedResponse = await this.convertXmlToJsObject(responseSoapMessage);
    } catch (error) {
      log.save('send-to-trembita|parse-response-error', { error: error && error.message, response, responseSoapMessage });
      parsedResponse = {};
    }

    let isDone;

    let isFault = false;
    if (trembitaConfig.serviceConfig.serviceCode === 'PostPetition' && PropByPath.get(parsedResponse, 's:Envelope.s:Body.0.s:Fault.0')) {
      isFault = true;
    }
    if (
      (trembitaConfig.serviceConfig.serviceCode === 'PostPetition8' ||
        trembitaConfig.serviceConfig.serviceCode === 'PostPetition13' ||
        trembitaConfig.serviceConfig.serviceCode === 'PostPetition14' ||
        trembitaConfig.serviceConfig.serviceCode === 'PostPetition15' ||
        trembitaConfig.serviceConfig.serviceCode === 'PostPetition16' ||
        trembitaConfig.serviceConfig.serviceCode === 'PostPetition18' ||
        trembitaConfig.serviceConfig.serviceCode === 'PostPetition27') &&
      parseInt(PropByPath.get(parsedResponse, 's:Envelope.s:Body.0.PetitionExchangeExpAnswer.0.FaultCode')) !== 0
    ) {
      isFault = true;
    }

    log.save('send-to-trembita|parsed-response', { response, isFault });
    if (!isFault) {
      let responseDoneParams = {};
      let responseParam;

      // Check for PetitionExchange
      responseParam = PropByPath.get(parsedResponse, 's:Envelope.s:Body.0.PetitionExchangeAnswer.0.done.0');
      if (responseParam) responseDoneParams['PetitionExchange'] = responseParam === 'true';

      // Check for listMethods
      responseParam = PropByPath.get(parsedResponse, 's:Envelope.s:Body.0.xro:listMethodsResponse.0');
      if (responseParam) responseDoneParams['listMethods'] = !!responseParam;

      isDone = Object.keys(responseDoneParams).length > 0;
    } else {
      log.save('send-to-trembita|parsed-response|error', { response, isDone: false });
      const error = new Error(response);
      error.details = { requestOptions: this.debug ? requestOptions : { ...requestOptions, body: '***' } };
      throw error;
    }

    return {
      request: this.debug ? requestOptions : undefined,
      response,
      isDone,
    };
  }

  async prepareResponseSoapMessage(response) {
    let newResponse = response;
    newResponse = newResponse.split('SOAP-ENV').join('s');
    newResponse = newResponse.split('soapenv').join('s');
    const responseSoapMessageStartIndex = newResponse.indexOf('<s:Envelope');
    const responseSoapMessageEndIndex = newResponse.indexOf('</s:Envelope>') + 13;
    newResponse = newResponse.substring(responseSoapMessageStartIndex, responseSoapMessageEndIndex);

    return newResponse;
  }

  /**
   * Convert XML to JS object.
   * @private
   * @param {string} xml XML string.
   * @returns {Promise<object>} JS object promise.
   */
  async convertXmlToJsObject(xml) {
    return new Promise((resolve, reject) => {
      xml2js.parseString(xml, (error, jsObject) => {
        // Check.
        if (error) {
          reject(error);
        }

        // Resolve JS object.
        resolve(jsObject);
      });
    });
  }

  /**
   * @private
   * @param {string} service Service name
   * @return {{trembitaHeader: Object, serviceConfig: Object}} Service config
   */
  getTrembitaConfig(service) {
    const {
      requester: {
        externalService: {
          trembita: { trembitaHeader, serviceList = {} },
        },
      },
    } = global.config;

    // Get specific or default service config.
    const serviceConfig = serviceList[service] || trembitaHeader.service;

    if (!serviceConfig) {
      throw new Error('Trembita provider. Service config not defined.');
    }

    if (!serviceConfig?.soapAction) {
      throw new Error('Trembita provider. Service soap action not defined.');
    }

    return { trembitaHeader, serviceConfig };
  }
}

module.exports = TrembitaProvider;
