const axios = require('axios');
const { PassThrough } = require('stream');

const { appendTraceMeta, getTraceMeta, getTraceId } = require('./async_local_storage');
const StorageService = require('../services/storage');
const DocumentAttachmentModel = require('../models/document_attachment');
const Sandbox = require('./sandbox');
const typeOf = require('./type_of');

const HIDE_REPLACEMENT_TEXT = '*****';
const MAX_LOG_LENGTH = 100e3 - 1000;

/**
 * External Reader.
 */
class ExternalReader {
  /**
   * External Reader constructor.
   * @param {object} config External reader config.
   */
  constructor(config = global.config.external_reader) {
    // Singleton.
    if (!ExternalReader.singleton) {
      // Save params.
      const { url, urlTemplate, basicAuthToken, timeout } = config;
      this.url = url;
      this.urlTemplate = urlTemplate;
      this.basicAuthToken = basicAuthToken;
      this.timeout = timeout;
      this.storageService = new StorageService();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.sandbox = new Sandbox();

      // External reader routes.
      this.apiRoutes = Object.freeze({
        getData: '/<service>/<method>',
        getMocksKeysByUser: '/mocks-keys-by-user',
        deleteCache: '/cache/<userIdentifier>',
        getCaptchaChallenge: '/captcha',
      });

      // Define singleton.
      ExternalReader.singleton = this;
    }

    // Return singleton.
    return ExternalReader.singleton;
  }

  /**
   * Get captcha challenge.
   * @param {string} service External service service.
   * @param {string} method External service method.
   * @return {Promise<{challenge: string}>}
   */
  async getCaptchaChallenge(service, method) {
    const response = await axios({
      url: `${this.url}${this.apiRoutes.getCaptchaChallenge}/${service}/${method}`,
      method: 'GET',
      headers: {
        Authorization: this.basicAuthToken,
        'x-trace-id': getTraceId(),
      },
      timeout: this.timeout,
    });
    return response.data;
  }

  /**
   * Get data.
   * @private.
   * @param {string} service External service service.
   * @param {string} method External service method.
   * @param {string} oauthToken OAuth token.
   * @param {object} userFilter User filter.
   * @param {object} nonUserFilter Non-user filter.
   * @param {Object} extraParams Extra params.
   * @param {string} enabledMocksHeader Header with enabled mocks.
   * @param {string} token Access token.
   * @param {number} customTimeout Custom timeout.
   * @returns {object} Data.
   */
  async getData(
    service,
    method,
    captchaPayload,
    oauthToken,
    userFilter = {},
    nonUserFilter = {},
    extraParams = {},
    enabledMocksHeader,
    token,
    customTimeout,
  ) {
    // Get data.
    // TODO Delete IF ELSE when updated config on prod
    let url;
    if (this.url) {
      url = `${this.url}${this.apiRoutes.getData}`.replace('<service>', service).replace('<method>', method);
    } else {
      url = this.urlTemplate.replace('<service>', service).replace('<method>', method);
    }

    // Set the maximum timeout to 5 minutes in milliseconds.
    if (customTimeout && customTimeout > 300000) {
      customTimeout = 300000;
    }

    let response;
    try {
      response = await axios({
        url: url,
        method: 'POST',
        headers: {
          Authorization: this.basicAuthToken,
          'OAuth-Token': oauthToken,
          'x-access-token': token,
          'x-trace-id': getTraceId(),
          'enabled-mocks': enabledMocksHeader,
        },
        data: {
          userFilter,
          nonUserFilter,
          extraParams,
          captchaPayload,
        },
        timeout: customTimeout || this.timeout,
      });
    } catch (error) {
      // Replace all character except allowed.
      const errorMessage = (error.response?.body?.error?.message || error.toString()).replace(/[^a-zA-Z0-9+=_\-?"'.:, ]/g, '');

      if (error.code === 'ESOCKETTIMEDOUT' || error.cause?.code === 'ESOCKETTIMEDOUT') {
        log.save('external-reader-get-data-esockettimeout', {
          url,
          errorCode: error.code || error.cause?.code,
          error: error.message,
          service,
          method,
        });
      }

      if (error.code === 'ECONNRESET' || error.cause?.code === 'ECONNRESET' || error.message === 'socket hang up') {
        log.save('external-reader-get-data-econnreset', {
          url,
          errorCode: error.code || error.cause?.code,
          error: error.message,
          service,
          method,
        });
      }

      this.appendExternalReaderErrors(errorMessage);
      if (error?.response?.headers?.['returned-mock']) {
        this.appendReturnedMocksHeader(error.response.headers['returned-mock']);
      }
      throw error;
    }

    if (response?.headers?.['returned-mock']) {
      this.appendReturnedMocksHeader(response.headers['returned-mock']);
    }

    // Return defined data.
    return response.data;
  }

  /**
   * Get data by user.
   * @param {string} service External service service.
   * @param {string} method External service method.
   * @param {string} oauthToken OAuth token.
   * @param {{ipn}} user User.
   * @param {object} nonUserFilter Non-user filter.
   * @param {Object} extraParams Extra params.
   * @param {{head: [], member: []}} userUnits User units.
   * @param {string} enabledMocksHeader Header with enabled mocks.
   * @param {string} token Access token.
   * @param {number} customTimeout Custom timeout.
   * @returns {object} Data.
   */
  async getDataByUser(
    service,
    method,
    captchaPayload,
    oauthToken,
    user,
    nonUserFilter = {},
    extraParams = {},
    userUnits = { head: [], member: [] },
    enabledMocksHeader,
    token,
    customTimeout,
  ) {
    // Define user filter.
    const { ipn, edrpou } = user;
    const userFilter = { ipn, edrpou, userUnits, userServices: user.services };

    // Get data.
    let data = await this.getData(
      service,
      method,
      captchaPayload,
      oauthToken,
      userFilter,
      nonUserFilter,
      extraParams,
      enabledMocksHeader,
      token,
      customTimeout,
    );
    let dataToLog = '';
    const ending = '<...cut>';
    try {
      if (typeof data === 'object') {
        const stringifiedData = JSON.stringify(data);
        dataToLog = stringifiedData.length > MAX_LOG_LENGTH ? stringifiedData.substring(0, MAX_LOG_LENGTH - ending.length) + ending : stringifiedData;
      } else if (typeof data === 'string') {
        dataToLog = data.length > MAX_LOG_LENGTH ? data.substring(0, MAX_LOG_LENGTH - ending.length) + ending : data;
      }
    } catch (error) {
      log.save('external-reader-cannot-cut-data-to-log', { error, service, method });
      dataToLog = data;
    }
    log.save('external-reader-raw-data-response', {
      service,
      method,
      userFilter: { ...userFilter, userServices: HIDE_REPLACEMENT_TEXT },
      nonUserFilter,
      data: dataToLog,
    });

    // Check for attachments saving.
    if (
      extraParams.isSaveAttachments &&
      extraParams.documentId &&
      typeOf(data.data?.attachments) === 'array' &&
      data.data.attachments.length &&
      data.data.attachments.every((attachment) => !!attachment.name && !!attachment.data)
    ) {
      if (extraParams.deleteOldAttachmentsBeforeSave) {
        // Remove old attachments.
        try {
          await this.documentAttachmentModel.deleteByDocumentId(extraParams.documentId);
        } catch (error) {
          throw new Error(`ExternalReader.getDataByUser. Cannot delete old attachments. ${error.toString()}`);
        }
      } else if (extraParams.isRewriteAttachmentsOnEachRequest) {
        // Remove old attachments with the same external-reader method.
        let attachments;
        try {
          attachments = await this.documentAttachmentModel.getByDocumentIdAndMeta(extraParams.documentId, {
            fromExternalReader: `${service}.${method}`,
          });
        } catch (error) {
          throw new Error(`ExternalReader.getDataByUser. Cannot get old attachments info for rewriting. ${error.toString()}`);
        }

        try {
          await Promise.all(attachments.map((v) => this.storageService.provider.deleteFile(v.link)));
        } catch (error) {
          // Do not throw error. This error should not block saving new attachments.
          log.save('external-reader|get-data-by-user|delete-file-from-file-storage-error', { error: error.toString() }, 'warn');
        }

        try {
          await Promise.all(attachments.map((v) => this.documentAttachmentModel.delete(v.id)));
        } catch (error) {
          throw new Error(`ExternalReader.getDataByUser. Cannot delete old attachments. ${error.toString()}`);
        }
      }

      // Additional preparations.
      data.data.attachments = extraParams.prepareAttachments?.includes('=>')
        ? this.sandbox.evalWithArgs(extraParams.prepareAttachments, [{ attachments: data.data.attachments, filters: nonUserFilter }], {
          meta: { fn: 'getDataByUser.prepareAttachments', service, method },
        })
        : data.data.attachments;

      // Save new attachments.
      for (let attachment of data.data.attachments) {
        // Upload file to file storage.
        let fileInfo;
        try {
          const bufferStream = new PassThrough();
          bufferStream.end(Buffer.from(attachment.data, 'base64'));
          fileInfo = await this.storageService.provider.uploadFileFromStream(
            bufferStream,
            attachment.name,
            attachment.description || attachment.name,
            'application/pdf',
          );
        } catch (error) {
          throw new Error(`ExternalReader.getDataByUser. Cannot upload attachment to file storage. ${error.toString()}`);
        }

        // Insert file as attachment to document.
        try {
          await this.documentAttachmentModel.create({
            documentId: extraParams.documentId,
            name: fileInfo.name,
            type: fileInfo.contentType,
            size: fileInfo.contentLength,
            link: fileInfo.id,
            isGenerated: false,
            isSystem: true,
            meta: { fromExternalReader: `${service}.${method}` },
          });
        } catch (error) {
          throw new Error(`ExternalReader.getDataByUser. Cannot insert attachment to DB. ${error.toString()}`);
        }

        // Remove base64 data.
        attachment.data = '****';
      }
    }

    // Return defined data.
    return data;
  }

  /**
   * @param {string} authAccessToken
   * @param {Array<string>} readers
   * @return {Promise<Object>}
   */
  async getMocksKeysByUser(authAccessToken, readers) {
    const readersQuery = readers?.length ? readers.map((reader) => `readers=${reader}`).join('&') : null;

    let query = '?';
    query += readersQuery ? readersQuery : '';
    query = query === '?' ? '' : query;

    const response = await global.httpClient.request(
      `${this.url}${this.apiRoutes.getMocksKeysByUser}${query}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.basicAuthToken,
          'x-trace-id': getTraceId(),
          'OAuth-Token': authAccessToken,
        },
      },
      'external-reader-get-mocks-keys-by-user',
      { isNonSensitiveDataRegime: true },
    );

    const responseBody = await response.json();
    return responseBody.data;
  }

  /**
   * Delete cache by user.
   * @param {string} oauthToken OAuth token.
   * @param {{ipn: string, edrpou: string}} user User.
   * @return {Promise<{keys_deleted: number}>}.
   */
  async deleteCacheByUser(oauthToken, user) {
    // Prepare url.
    const url = `${this.url}${this.apiRoutes.deleteCache}`.replace('<userIdentifier>', user.ipn || user.edrpou);

    // Return response.
    const response = await axios({
      url: url,
      method: 'DELETE',
      headers: {
        Authorization: this.basicAuthToken,
        'x-trace-id': getTraceId(),
        'OAuth-Token': oauthToken,
      },
      timeout: this.timeout,
    });
    return response.data;
  }

  appendReturnedMocksHeader(returnedMock) {
    const traceMeta = getTraceMeta();
    if (!traceMeta.returnedMocksHeader) {
      traceMeta.returnedMocksHeader = '';
    }
    traceMeta.returnedMocksHeader += traceMeta.returnedMocksHeader === '' ? `${returnedMock}` : `|${returnedMock}`;
    appendTraceMeta({ returnedMocksHeader: traceMeta.returnedMocksHeader });
  }

  appendExternalReaderErrors(externalReaderError) {
    const traceMeta = getTraceMeta();

    if (!traceMeta) {
      log.save('external-reader-errors|trace-meta-not-found', { traceId: getTraceId(), externalReaderError });
      return;
    }

    if (!traceMeta.externalReaderErrors) {
      traceMeta.externalReaderErrors = '';
    }
    traceMeta.externalReaderErrors += traceMeta.externalReaderErrors === '' ? `${externalReaderError}` : `|${externalReaderError}`;
    appendTraceMeta({ externalReaderErrors: traceMeta.externalReaderErrors });
  }

  /**
   * Get captcha challenge.
   * @param {string} service External service service.
   * @param {string} method External service method.
   * @return {Promise<{isEnabledFor: string[]}>}
   */
  async getCaptchProviders() {
    const response = await axios({
      url: `${this.url}/captcha/providers/list`,
      method: 'GET',
      headers: {
        Authorization: this.basicAuthToken,
        'x-trace-id': getTraceId(),
      },
      timeout: this.timeout,
    });
    return response.data;
  }
}

module.exports = ExternalReader;
