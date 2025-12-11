const PropByPath = require('prop-by-path');
const qs = require('qs');
const axios = require('axios');

const Provider = require('./provider');
const HttpRequest = require('../../../../../lib/http_request');
const { getTraceId } = require('../../../../../lib/async_local_storage');
const { prepareAxiosErrorToLog } = require('../../../../../lib/helpers');
const { FILE_DOCUMENT_TEMPLATE_ID } = require('../../../../../constants/common');

// Constants.
const API_METHODS = {
  getKey: '/keys',
  getRecord: '/records',
  getRecordPost: '/records-by-post',
  getRecordsFiltered: '/records/filter',
  createRecord: '/records',
  updateRecord: '/records',
  deleteRecord: '/records',
  ping: '/test/ping',
};

/**
 * Liquio provider.
 * @extends Provider
 */
class LiquioProvider extends Provider {
  /**
   * Constructor.
   * @param {object} config Config.
   * @param {string} config.url API URL.
   * @param {{createRecord, updateRecord, deleteRecord}} config.apiMethods API methods.
   * @param {string} config.token Request auth token.
   */
  constructor(config) {
    // Define singleton.
    if (!LiquioProvider.singleton) {
      super();

      this.config = config;
      const { url, apiMethods, token } = config;
      this.url = url;
      this.apiMethods = { ...API_METHODS, ...apiMethods };
      this.headers = {
        'Content-Type': 'application/json',
        token: `${token}`,
      };
      LiquioProvider.singleton = this;
    }
    return LiquioProvider.singleton;
  }

  /**
   * Save records to csv.
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} [data.csvMap] Csv map.
   * @param {boolean} [data.noLimit] No limit.
   * @param {array} [data.filters] Filters.
   * @param {object} [data.sort] Sort.
   * @param {string} [data.searchEqual] Search equal.
   * @param {string} [data.searchEqual2] Search equal 2.
   * @param {string} [data.searchEqual3] Search equal 3.
   * @param {string} [data.searchLike] Search like.
   * @param {string} [data.searchLike2] Search like 2.
   * @param {string} [data.searchLike3] Search like 3.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async saveRecordsToCsv(
    {
      filestorage,
      documentModel,
      eventModel,
      workflowId,
      eventTemplateId,
      registerId,
      keyId,
      csvMap = '{}',
      noLimit = false,
      filters,
      additionalFilter,
      sort,
      searchEqual,
      searchEqual2,
      searchEqual3,
      searchLike,
      searchLike2,
      searchLike3,
    },
    _eventContext,
  ) {
    let queryString = `?register_id=${registerId}&key_id=${keyId}&allow_see_all_records=true`;
    if (filters) {
      for (const filter of filters) {
        if (filter.path && filter.name) {
          queryString += `&data[${filter.path}]=${filter.name}`;
        }
      }
    }

    const indexFieldsQuery = this.getIndexFieldsQueryParams({
      searchEqual,
      searchEqual2,
      searchEqual3,
      searchLike,
      searchLike2,
      searchLike3,
    });
    if (indexFieldsQuery) {
      queryString += `&${indexFieldsQuery}`;
    }

    if (additionalFilter) {
      queryString += `&additional_filter=${encodeURIComponent(Buffer.from(additionalFilter).toString('base64'))}`;
    }

    if (sort) {
      Object.keys(sort).forEach((v) => (queryString += `&sort[${v}]=${sort[v]}`));
    }
    queryString += `&csv_map=${csvMap}&no_limit=${noLimit}`;

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.getRecordsFiltered}${encodeURI(queryString)}`,
      method: HttpRequest.Methods.POST,
      headers: this.getHeadersWithTraceId(),
      responseType: 'stream',
      // body: '' // JSON.stringify({ additionalFilter }),
    };
    log.save('get-csv-records-from-registers|request-options', { requestOptions });

    // Do request.
    let fileInfo;

    try {
      let downloadDocumentReadStream;
      try {
        downloadDocumentReadStream = (await axios(requestOptions)).data;
      } catch (error) {
        log.save('get-csv-records-from-registers|request-error', prepareAxiosErrorToLog(error), 'error');
        throw error;
      }
      fileInfo = await filestorage.uploadFileFromStream(downloadDocumentReadStream, 'records', undefined, 'text/csv; charset=utf-8', undefined, true);
      log.save('get-csv-records-from-registers|successful', { fileInfo });

      // Save document and return.
      const { id: fileId, contentType, name } = fileInfo;

      // Check that is correct content type.
      if (contentType !== 'text/csv; charset=utf-8') {
        log.save('get-csv-records-from-registers|wrong-content-type', { contentType });
        throw new Error('File download. Wrong content type.');
      }

      let savedDocument;
      try {
        savedDocument = await documentModel.create({
          documentTemplateId: FILE_DOCUMENT_TEMPLATE_ID,
          fileId,
          name,
          fileType: contentType,
        });
      } catch (error) {
        log.save('get-csv-records-from-registers-save-document|error', {
          error: error && error.message,
        });
        throw error;
      }
      const { id: savedDocumentId } = savedDocument;
      if (!savedDocumentId) {
        throw new Error('Can not save document.');
      }

      // Add to event.
      const saveToEventResult = await eventModel.setDocumentIdByWorkflowIdAndEventTemplateId(workflowId, eventTemplateId, savedDocumentId);

      // Return saving result.
      return { savedDocument, saveToEventResult };
    } catch (error) {
      log.save('get-csv-records-from-registers|error', {
        ...prepareAxiosErrorToLog(error),
        registerId,
        keyId,
        csvMap,
        noLimit,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get records and metadata by `{ registerId, keyId, path, name }`.
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} [data.path] Path.
   * @param {string} [data.name] Name.
   * @param {number} [data.limit] Limit.
   * @param {object} [data.sort] Sort.
   * @param {function} [data.compareFunction] Compare function for sorting.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async #getRecordsWithMeta(
    {
      method,
      registerId,
      keyId,
      path,
      name,
      filters,
      recordId,
      recordIdsList,
      limit = 10,
      sort,
      compareFunction,
      searchEqual,
      searchEqual2,
      searchEqual3,
      searchLike,
      searchLike2,
      searchLike3,
      filtersType,
    },
    eventContext,
  ) {
    const startTimeStamp = Date.now();
    const {
      documents,
      events,
      eventTemplateJsonSchemaObject: { additionalFilter },
      requestMethod = 'GET',
    } = eventContext;
    // Get additional filter function if exists.
    const additionalFilterFunction = typeof additionalFilter === 'string' ? this.sandbox.evalWithArgs(
      additionalFilter,
      [],
      { meta: { fn: 'additionalFilter', caller: 'LiquioProvider.getRecord' } },
    ) : undefined;

    let requestOptions;

    if (requestMethod === 'GET') {
      let queryString = `?register_id=${registerId}&key_id=${keyId}&allow_see_all_records=true`;
      if (recordId) {
        queryString += `&record_id=${recordId}`;
      }
      if (recordIdsList && Array.isArray(recordIdsList)) {
        queryString += `&record_ids_list=[${recordIdsList.map((v) => `"${v}"`).join(',')}]`;
      }
      if (path && name) {
        queryString += `&data[${path}]=${Array.isArray(name) ? `[${name.map((v) => `"${v}"`).join(',')}]` : name}`;
      }
      if (filters) {
        for (const filter of filters) {
          queryString += `&data[${filter.path}]=${filter.name}`;
        }
      }
      if (filtersType === 'or') {
        queryString += '&data[_filters_type]=or';
      }
      const indexFieldsQuery = this.getIndexFieldsQueryParams({
        searchEqual,
        searchEqual2,
        searchEqual3,
        searchLike,
        searchLike2,
        searchLike3,
      });
      if (indexFieldsQuery) {
        queryString += `&${indexFieldsQuery}`;
      }
      if (sort) {
        Object.keys(sort).forEach((v) => (queryString += `&sort[${v}]=${sort[v]}`));
      } else {
        queryString += '&sort=null';
      }
      queryString += `&limit=${additionalFilterFunction ? 100000 : limit}`;

      // Request options.
      requestOptions = {
        url: `${this.url}${this.apiMethods.getRecord}${encodeURI(queryString)}`,
        method: HttpRequest.Methods.GET,
        headers: this.getHeadersWithTraceId(),
      };
      log.save(`${method}|requested`, { requestOptions });
    } else if (requestMethod === 'POST') {
      const body = {
        register_id: registerId,
        key_id: keyId,
        allow_see_all_records: true,
        record_id: recordId,
        record_ids_list: recordIdsList,
        data: {
          [path]: name,
        },
        search_equal: searchEqual,
        search_equal_2: searchEqual2,
        search_equal_3: searchEqual3,
        search: searchLike,
        search_2: searchLike2,
        search_3: searchLike3,
        sort: sort || 'null',
        limit: additionalFilterFunction ? 100000 : limit,
      };

      if (filters) {
        for (const filter of filters) {
          body.data[filter.path] = filter.name;
        }
      }

      // Request options.
      requestOptions = {
        url: `${this.url}${this.apiMethods.getRecordPost}`,
        method: HttpRequest.Methods.POST,
        headers: this.getHeadersWithTraceId(),
        body,
      };
      log.save('get-records-from-registers|requested', { requestOptions });
    } else {
      throw new Error(`LiquioProvider.getRecords: Unknown requestMethod: ${requestMethod}.`);
    }

    // Do request.
    let response;
    try {
      response = await HttpRequest.send(requestOptions);
      log.save(`${method}|successful`, { response, registerId, keyId, path, name });
    } catch (error) {
      log.save(`${method}|error`, { error: error && error.message, registerId, keyId, path, name });
      throw error;
    }

    // Handle additional filter.
    if (Array.isArray(response?.data) && additionalFilterFunction) {
      // Use additional filter function.
      try {
        response.data = response.data.filter((record) => additionalFilterFunction(record, documents, events));
      } catch (error) {
        log.save(`${method}|error-calling-additional-filter-function`, { error: error?.message, registerId, keyId, path, name, additionalFilter });
        throw error;
      }
    }

    // Sort result.
    if (response && Array.isArray(response.data) && compareFunction && typeof compareFunction === 'function') {
      response.data.sort(compareFunction);
    }
    if (response?.data && response?.data.length > limit) {
      response.data = response?.data.slice(0, limit);
    }
    log.save(`${method}|execution-time`, { registerId, keyId, additionalFilter, executionTime: `${Date.now() - startTimeStamp} ms` });

    // Return response.
    return response;
  }

  /**
   * Get records by `{ registerId, keyId, path, name }`.
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} [data.path] Path.
   * @param {string} [data.name] Name.
   * @param {number} [data.limit] Limit.
   * @param {object} [data.sort] Sort.
   * @param {function} [data.compareFunction] Compare function for sorting.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object[]>}
   */
  async getRecords(
    {
      registerId,
      keyId,
      path,
      name,
      filters,
      recordId,
      recordIdsList,
      limit = 10,
      sort,
      compareFunction,
      searchEqual,
      searchEqual2,
      searchEqual3,
      searchLike,
      searchLike2,
      searchLike3,
      filtersType,
    },
    eventContext,
  ) {
    const recordsResponse = await this.#getRecordsWithMeta(
      {
        method: 'get-records-from-registers',
        registerId,
        keyId,
        path,
        name,
        filters,
        recordId,
        recordIdsList,
        limit,
        sort,
        compareFunction,
        searchEqual,
        searchEqual2,
        searchEqual3,
        searchLike,
        searchLike2,
        searchLike3,
        filtersType,
      },
      eventContext,
    );
    return recordsResponse?.data;
  }

  /**
   * Count records by `{ registerId, keyId, path, name }`.
   * @param {object} data Data.
   * @param {number} data.registerId Register ID.
   * @param {number} data.keyId Register key ID.
   * @param {string} [data.path] Path.
   * @param {string} [data.name] Name.
   * @param {number} [data.limit] Limit.
   * @param {object} [data.sort] Sort.
   * @param {function} [data.compareFunction] Compare function for sorting.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<number>}
   */
  async countRecords(
    {
      registerId,
      keyId,
      path,
      name,
      filters,
      recordId,
      recordIdsList,
      compareFunction,
      searchEqual,
      searchEqual2,
      searchEqual3,
      searchLike,
      searchLike2,
      searchLike3,
      filtersType,
    },
    eventContext,
  ) {
    const recordsResponse = await this.#getRecordsWithMeta(
      {
        method: 'count-records-from-registers',
        registerId,
        keyId,
        path,
        name,
        filters,
        recordId,
        recordIdsList,
        compareFunction,
        searchEqual,
        searchEqual2,
        searchEqual3,
        searchLike,
        searchLike2,
        searchLike3,
        filtersType,
      },
      eventContext,
    );
    return recordsResponse?.meta?.count;
  }

  /**
   * @param {Object} queryParams
   * @param {Object} body
   * @return {Promise<Object>}
   */
  async findRecords(queryParams, body) {
    try {
      const query = qs.stringify(queryParams);
      const response = await axios({
        url: `${this.url}${this.apiMethods.getRecord}?${query}`,
        method: 'GET',
        headers: this.getHeadersWithTraceId(),
        data: body,
        timeout: this.timeout,
      });

      return this.prepareResponse(response);
    } catch (error) {
      log.save('liquio-register-provider|find-records|error', prepareAxiosErrorToLog(error));
      throw error;
    }
  }

  /**
   * Get record.
   * @param {string} id ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async getRecord(id, _eventContext) {
    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.getRecord}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: this.getHeadersWithTraceId(),
    };
    log.save('get-from-registers|requested', { requestOptions });

    // Do request.
    let response;
    try {
      response = await HttpRequest.send(requestOptions);
      log.save('get-from-registers|successful', { response, id });
    } catch (error) {
      log.save('get-from-registers|error', { error: error && error.message, id });
      throw error;
    }

    // Return response.
    return response && response.data;
  }

  /**
   * Create record.
   * @param {object} record Data.
   * @param {string} record.registerId Register ID.
   * @param {string} record.keyId Register key ID.
   * @param {object} record.data Data to save.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async createRecord(record, eventContext) {
    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.createRecord}`,
      method: HttpRequest.Methods.POST,
      headers: this.getHeadersWithAccessInfo(eventContext),
      body: record,
    };
    log.save('save-to-registers|requested', { requestOptions });

    // Do request.
    let response;
    try {
      response = await HttpRequest.send(requestOptions);
      log.save('saved-to-registers|successful', { response, record });
    } catch (error) {
      log.save('save-to-registers|error', { error: (error && error.message) || error, record });
      throw error;
    }

    // Return response.
    return response;
  }

  /**
   * Update record.
   * @param {string} id ID.
   * @param {object} record Data.
   * @param {string} record.registerId Register ID.
   * @param {string} record.keyId Register key ID.
   * @param {object} record.data Data to save.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async updateRecord(id, record, eventContext) {
    // Get record.
    let existingRecordData;
    try {
      const existingRecord = await this.getRecord(id);
      existingRecordData = existingRecord && existingRecord.data;
      if (!existingRecordData) {
        throw new Error('Can not find existing record data.');
      }
    } catch (error) {
      log.save('get-data-from-registers|error', {
        error: error && error.message,
        id,
        existingRecordData,
      });
      throw error;
    }
    let newRecordData = { ...existingRecordData };
    for (const recordDataKey in record.data) {
      const recordDataValue = record.data[recordDataKey];
      PropByPath.set(newRecordData, recordDataKey, recordDataValue);
    }
    record.data = newRecordData;

    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.updateRecord}/${id}`,
      method: HttpRequest.Methods.PUT,
      headers: this.getHeadersWithAccessInfo(eventContext),
      body: record,
    };
    log.save('update-in-registers|requested', { requestOptions });

    // Do request.
    let response;
    try {
      response = await HttpRequest.send(requestOptions);
      log.save('updated-in-registers|successful', { response, id, record });
    } catch (error) {
      log.save('update-in-registers|error', { error: error && error.message, id, record });
      throw error;
    }

    // Return response.
    return response;
  }

  /**
   * Get register key ID.
   * @param {string} id  Register key ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async getKeyById(id, _eventContext) {
    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.getKey}/${id}`,
      method: HttpRequest.Methods.GET,
      headers: this.getHeadersWithTraceId(),
    };
    log.save('get-key-from-registers|requested', { requestOptions });

    // Do request.
    let response;
    try {
      response = await HttpRequest.send(requestOptions);
      log.save('get-key-from-registers|successful', { response, id });
    } catch (error) {
      log.save('get-key-from-registers|error', { error: error && error.message, id });
      throw error;
    }

    // Return response.
    return response && response.data;
  }

  /**
   * Delete record.
   * @param {string} id ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async deleteRecord(id, eventContext) {
    // Request options.
    const requestOptions = {
      url: `${this.url}${this.apiMethods.deleteRecord}/${id}`,
      method: HttpRequest.Methods.DELETE,
      headers: this.getHeadersWithAccessInfo(eventContext),
    };
    log.save('delete-from-registers|requested', { requestOptions });

    // Do request.
    let response;
    try {
      response = await HttpRequest.send(requestOptions);
      log.save('deleted-from-registers|successful', { response, id });
    } catch (error) {
      log.save('delete-from-registers|error', { error: error && error.message, id });
      throw error;
    }

    // Return response.
    return response;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    const fullResponse = true;

    try {
      let response = await HttpRequest.send(
        {
          url: `${this.url}${this.apiMethods.ping}`,
          method: HttpRequest.Methods.GET,
        },
        fullResponse,
      );
      log.save('send-ping-request-to-register', response);
      const headers = response && response.fullResponse && response.fullResponse.headers && response.fullResponse.headers;
      const { version, customer, environment } = headers;
      return { version, customer, environment, body: response.body };
    } catch (error) {
      log.save('send-ping-request-to-register', error.message);
    }
  }

  getIndexFieldsQueryParams(indexFields) {
    const { searchEqual, searchEqual2, searchEqual3, searchLike, searchLike2, searchLike3 } = indexFields;

    return [
      searchEqual && `&search_equal=${searchEqual}`,
      searchEqual2 && `&search_equal_2=${searchEqual2}`,
      searchEqual3 && `&search_equal_3=${searchEqual3}`,
      searchLike && `&search=${searchLike}`,
      searchLike2 && `&search_2=${searchLike2}`,
      searchLike3 && `&search_3=${searchLike3}`,
    ]
      .filter(Boolean)
      .join('');
  }

  /**
   * Get headers with access info.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {{workflowId, requestAt, ...params}} Request user ID.
   */
  getHeadersWithAccessInfo(eventContext = {}) {
    const accessInfo = this.getAccessInfo(eventContext);
    return {
      ...this.getHeadersWithTraceId(),
      'access-info': Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64'),
    };
  }

  getHeadersWithTraceId() {
    return {
      ...this.headers,
      'x-trace-id': getTraceId(),
    };
  }

  /**
   * Get access info.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {{workflowId, requestAt, ...params}} Request user ID.
   */
  getAccessInfo(eventContext = {}) {
    // Define params.
    const {
      workflowId,
      eventTemplateJsonSchemaObject: { accessInfo: accessInfoObjectOrFunction },
      documents,
      events,
    } = eventContext;

    // Calc and return access info.
    const accessInfo =
      typeof accessInfoObjectOrFunction === 'string' ? this.sandbox.evalWithArgs(
        accessInfoObjectOrFunction,
        [documents, events],
        { meta: { fn: 'accessInfo', caller: 'LiquioProvider.getAccessInfo' } },
      ) : accessInfoObjectOrFunction || {};
    const calculatedAccessInfo = {
      workflowId,
      requestAt: new Date().toISOString(),
    };
    return {
      ...accessInfo,
      ...calculatedAccessInfo,
    };
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
      throw new Error(response.error.message);
    }
  }
}

module.exports = LiquioProvider;
