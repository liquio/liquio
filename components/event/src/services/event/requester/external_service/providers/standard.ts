import fs from 'node:fs';
import stream from 'node:stream';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import _ from 'lodash';

import { Rmq } from '../../../../../lib/rmq';
import { Provider } from './provider';
import { FILE_DOCUMENT_TEMPLATE_ID } from '../../../../../constants/common';

/**
 * Standard provider.
 * @extends Provider
 */
export class StandardProvider extends Provider {
  static singleton: StandardProvider;

  config: any;
  externalServiceDiscovery: any;

  /**
   * Standard provider constructor.
   * @param {object} config Config.
   * @param {string} config.url API URL.
   * @param {{sendDocument}} config.apiMethods API methods.
   * @param {string} config.token Request auth token.
   */
  constructor(config?: any) {
    // Define singleton.
    if (!StandardProvider.singleton) {
      super();
      this.config = config;
      const { providersConfigPath } = config || {};
      if (providersConfigPath) {
        ({ externalServiceDiscovery: this.externalServiceDiscovery } = this.getProvidersConfig(providersConfigPath));
      } else if (Object.keys(config || {}).length) {
        this.externalServiceDiscovery = config;
      }
      StandardProvider.singleton = this;
    }
    return StandardProvider.singleton;
  }

  /**
   * Send.
   * @param {object} data Data.
   * @param {{workflowId, documentId, data, fileP7s}} data.body Object to send.
   * @param {{service}} data.destination Destination service.
   * @param {boolean} isTest Is test response.
   * @param {{filestorage, documentModel}} options Services and models.
   */
  async send(data: any, isTest = false, { filestorage, documentModel }: any = {}): Promise<any> {
    // Define body and destination service params.
    const { body, destination, responseFile, documentId, eventId, saveBase64Logs } = data;
    const { service } = destination;

    // Define trace log id.
    const traceLogId = randomUUID();

    // Get options.
    const {
      // REST.
      url,
      authorization,
      requestTimeout,
      retriesAfter = [],
      // RMQ.
      amqpConnection,
      readingQueueName,
      writingQueueName,
      readingExchangeName,
      writingExchangeName,
      sender,
      readingDurable,
      writingDurable,
      persistent,
      getIncomingMessageInterval,
      getIncomingMessageTimeout,
      readingXMessageTtl,
      readingXQueueType,
      writingXMessageTtl,
      writingXQueueType,
      maxHandlingMessages,
      addRequestPersonAndRepresentative,
      event,
      responseDecorator,
      rmqDecorator: { use: useRmqDecorator = false, url: rmqDecoratorUrl, token: rmqDecoratorToken } = {},
    } = this.getProviderConfig(service);

    let response;
    try {
      switch (true) {
        case !!url:
          response = await this.sendRestRequest({
            data,
            isTest,
            body,
            url,
            authorization,
            requestTimeout,
            retriesAfter,
            documentId,
            eventId,
            filestorage,
            documentModel,
            saveBase64Logs,
          });
          break;
        case !!amqpConnection || !!useRmqDecorator:
          response = await this.sendRmqRequest({
            config: {
              amqpConnection,
              readingQueueName,
              writingQueueName,
              readingExchangeName,
              writingExchangeName,
              sender,
              readingDurable,
              writingDurable,
              persistent,
              getIncomingMessageInterval,
              getIncomingMessageTimeout,
              readingXMessageTtl,
              readingXQueueType,
              writingXMessageTtl,
              writingXQueueType,
              maxHandlingMessages,
              addRequestPersonAndRepresentative,
              event,
              responseDecorator,
              useRmqDecorator,
              rmqDecoratorUrl,
              rmqDecoratorToken,
            },
            body,
            traceLogId,
            service,
            responseFile,
            filestorage,
            documentModel,
            saveBase64Logs,
          });
          break;
        default:
          throw new Error('Custom provider type not defined.');
      }
    } catch (error) {
      global.log.save('standard-provider-method-error', {
        error: (error && error.message) || error,
      });
      throw error;
    }

    // Return response with defined external ID.
    return response;
  }

  /**
   * Send REST request.
   * @private
   */
  async sendRestRequest({
    data,
    isTest,
    body,
    url,
    authorization,
    requestTimeout,
    retriesAfter,
    documentId,
    eventId,
    filestorage,
    documentModel,
    saveBase64Logs,
  }: any): Promise<any> {
    // Request options.
    const requestOptions = {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      data: body,
      timeout: requestTimeout,
    };
    global.log.save('send-to-standard-provider|request-options', { requestOptions });

    // Do request.
    let response;
    const errors = [];
    try {
      const retriesAfterWithStartNow = [0, ...retriesAfter];
      for (const retryAfter of retriesAfterWithStartNow) {
        try {
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          response = (await axios(requestOptions)).data;
          global.log.save('send-to-standard-provider|response', { requestOptions, response, data });
          break;
        } catch (error) {
          errors.push(error);
        }
      }
      if (!response) {
        throw new Error(errors.map((e) => e && e.message).join('|'));
      }
    } catch (error) {
      global.log.save('send-to-standard-provider|all|exception', { error: error && error.message, data });
      throw error;
    }
    if (isTest) {
      return response;
    }
    const isDone = !!((response && response.data && response.data.id) || response.isSuccess);
    if (!isDone) {
      throw new Error('Response should be with data identifier at "data.id" or success indicator at "isSuccess".');
    }

    // Append external ID.
    const externalIdToSave = {
      documentId,
      eventId,
      externalId: response && response.data && response.data.id,
    };
    if (typeof response === 'object') {
      response.externalIdToSave = externalIdToSave;
    }

    // Create document with file if need it.
    if (response.file) {
      try {
        response.savedDocument = await this.saveDocument({
          file: response.file,
          filestorage,
          documentModel,
        });
      } catch (error) {
        global.log.save('standard-provider-rest-response-file-error', {
          error: error && error.message,
          response,
        });
        throw error;
      }
      try {
        if (!saveBase64Logs) response.file.content = '***';
      } catch (error) {
        global.log.save('standard-provider-hide-file-content-error', { error: error?.message, file: response.file });
      }
    }

    // Return response with defined external ID.
    return response;
  }

  /**
   * Send RMQ request.
   * @private
   * @param {object} config RMQ config.
   * @param {object} body Request body.
   * @param {string} traceLogId Trace log ID.
   * @param {string} service Service name.
   * @param {object} responseFile Response file.
   * @param {object} filestorage Filestorage.
   * @param {object} documentModel Document model.
   * @returns {Promise<object[]>} Data.
   */
  async sendRmqRequest({ config, body, traceLogId, service, responseFile, filestorage, documentModel, saveBase64Logs }: any): Promise<any> {
    // Init RMQ connection.
    const rmq = new Rmq(service);
    await rmq.init(config);

    const {
      readingQueueName,
      writingQueueName,
      writingExchangeName,
      persistent,
      getIncomingMessageTimeout,
      event,
      responseDecorator,
      useRmqDecorator,
      rmqDecoratorUrl,
      rmqDecoratorToken,
    } = config;

    // Request data.
    let response;
    try {
      global.log.save('standard-provider-rmq-request', { body, traceLogId, event });
      if (useRmqDecorator) {
        response = await rmq.sendRequestAndWaitResponseViaDecorator({
          id: traceLogId,
          request: (body && body.data) || body,
          event,
          rmqDecoratorUrl,
          rmqDecoratorToken,
          writingQueueName,
          writingExchangeName,
          persistent,
          readingQueueName,
          getIncomingMessageTimeout,
        });
      } else {
        response = await rmq.sendRequestAndWaitResponse(traceLogId, (body && body.data) || body, event);
      }

      global.log.save('standard-provider-rmq-response', { response, traceLogId, event });

      if (!response) {
        const error: any = new Error('Response not defined.');
        error.details = {
          id: traceLogId,
          request: (body && body.data) || body,
          event: event,
        };
        throw error;
      }
      if (typeof responseDecorator === 'string') {
        response = this.sandbox.evalWithArgs(
          responseDecorator,
          [response],
          { meta: { fn: 'responseDecorator', caller: 'StandardProvider.sendRmqRequest' } },
        );
      }
      if (_.get(response, 'payload.response.output.0.success') !== true) {
        const error: any = new Error('Invalid response.');
        error.details = response;
        throw error;
      }
    } catch (error) {
      global.log.save('standard-provider-rmq-error', {
        error: (error && error.message) || error,
        traceLogId,
      });
      throw error;
    }

    global.log.save('standard-provider-rmq-prepared-response', { response, traceLogId, event });

    if (responseFile) {
      try {
        const executedResponseFile = this.sandbox.evalWithArgs(
          responseFile,
          [response],
          { meta: { fn: 'responseFile', caller: 'StandardProvider.sendRmqRequest' } },
        );

        if (executedResponseFile !== null) {
          response.savedDocument = await this.saveDocument({
            file: executedResponseFile,
            filestorage,
            documentModel,
          });
        }
      } catch (error) {
        global.log.save('standard-provider-rmq-response-file-error', {
          error: error && error.message,
          response,
        });
        throw error;
      }
      if (typeof response?.payload?.response?.document === 'string') {
        try {
          if (!saveBase64Logs) response.payload.response.document = '***';
        } catch (error) {
          global.log.save('standard-provider-hide-rmq-file-content-error', { error: error?.message, file: response.payload.response.document });
        }
      }
    }

    // Return response.
    return response;
  }

  /**
   * Save document.
   * @private
   * @param {object} file File.
   * @param {object} filestorage Filestorage.
   * @param {object} documentModel Document model.
   * @returns {Promise<object>} Document.
   */
  async saveDocument({ file, filestorage, documentModel }: any): Promise<any> {
    // Upload base64 content as file.
    const { name, description, contentType, content, p7sContent } = file || {};
    if (!name || !contentType || !content) {
      throw new Error('Response file is not valid.');
    }

    const contentBuffer = Buffer.from(content, 'base64');
    const contentReadableStream = stream.Readable.from(contentBuffer);
    const fileInfo = await filestorage.uploadFileFromStream(contentReadableStream, name, description, contentType);

    if (!fileInfo) {
      throw new Error('File upload error.');
    }

    const { id: fileId, contentType: fileType, name: fileName } = fileInfo || {};
    if (!fileId || !fileType || !fileName) {
      throw new Error('File info is not valid.');
    }

    let savedDocument;
    try {
      savedDocument = await documentModel.create({
        documentTemplateId: FILE_DOCUMENT_TEMPLATE_ID,
        fileId,
        fileName,
        fileType,
      });
    } catch (error) {
      global.log.save('standard-provider-create-document-error', {
        error: error && error.message,
        fileInfo,
      });
      throw error;
    }

    if (p7sContent) {
      await filestorage.addP7sSignature(fileId, p7sContent);
    }

    const { id: savedDocumentId } = savedDocument;
    if (!savedDocumentId) {
      throw new Error('Can not save document.');
    }

    return savedDocument;
  }

  /**
   * Get providers config.
   * @private
   * @param {string} providersConfigPath Providers config path.
   * @returns {object} Providers config.
   */
  getProvidersConfig(providersConfigPath: string): any {
    let providersConfig;
    try {
      const providersConfigData = fs.readFileSync(providersConfigPath, { encoding: 'utf8' });
      providersConfig = JSON.parse(providersConfigData);
    } catch (error) {
      global.log.save('standard-providers-config-definition-error', {
        error: error && error.message,
        providersConfigPath,
      });
    }
    return providersConfig;
  }

  /**
   * Get provider config.
   * @param {string} service Destination service.
   * @returns {{url, authorization, requestTimeout, retriesAfter}} Provider config.
   */
  getProviderConfig(service: string): any {
    if (!this.externalServiceDiscovery) {
      throw new Error('External services discovery disabled.');
    }
    if (!this.externalServiceDiscovery[service]) {
      throw new Error('External services discovery not contain information about needed service.');
    }
    return this.externalServiceDiscovery[service];
  }
}
