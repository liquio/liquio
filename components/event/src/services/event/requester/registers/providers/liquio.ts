import PropByPath from 'prop-by-path';
import { createRegisterApiClient, RegisterApiClient, RegisterApiError } from '@liquio/back-core';

import { Provider } from './provider';
import { Helpers } from '../../../../../lib/helpers';
const { prepareAxiosErrorToLog } = Helpers;
import { FILE_DOCUMENT_TEMPLATE_ID } from '../../../../../constants/common';
import { getLog } from '../../../../../lib/context';

/**
 * Liquio provider.
 * @extends Provider
 */
export class LiquioProvider extends Provider {
  static singleton: LiquioProvider;

  config: any;
  url: any;
  client: RegisterApiClient;
  sandbox: any;

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {string} config.url API URL.
   * @param {string} config.token Request auth token.
   */
  constructor(config: any) {
    super();

    // Define singleton.
    if (!LiquioProvider.singleton) {
      this.config = config;
      const { url, token, timeout } = config;
      this.url = url;
      this.client = createRegisterApiClient({
        url,
        token,
        timeout,
        getLog,
      });
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
    }: any,
    _eventContext?: any,
  ): Promise<any> {
    const data: Record<string, any> = {};
    if (filters) {
      for (const filter of filters) {
        if (filter.path && filter.name) {
          data[filter.path] = filter.name;
        }
      }
    }

    const query: Record<string, any> = {
      register_id: registerId,
      key_id: keyId,
      allow_see_all_records: true,
      data,
      ...this.getIndexFieldsQuery({
        searchEqual,
        searchEqual2,
        searchEqual3,
        searchLike,
        searchLike2,
        searchLike3,
      }),
      additional_filter: additionalFilter ? Buffer.from(additionalFilter).toString('base64') : undefined,
      sort,
      csv_map: csvMap,
      no_limit: noLimit,
    };
    getLog().save('get-csv-records-from-registers|request-options', { registerId, keyId, csvMap, noLimit });

    // Do request.
    let fileInfo;

    try {
      let downloadDocumentReadStream;
      try {
        downloadDocumentReadStream = (await this.client.exportFilteredRecordsCsv(query, { timeout: 0 })).stream;
      } catch (error: any) {
        getLog().save('get-csv-records-from-registers|request-error', prepareAxiosErrorToLog(error), 'error');
        throw error instanceof RegisterApiError && error.code === 'HTTP_ERROR' ? this.toCsvHttpError(error) : error;
      }
      fileInfo = await filestorage.uploadFileFromStream(downloadDocumentReadStream, 'records', undefined, 'text/csv; charset=utf-8', undefined, true);
      getLog().save('get-csv-records-from-registers|successful', { fileInfo });

      // Save document and return.
      const { id: fileId, contentType, name } = fileInfo;

      // Check that is correct content type.
      if (contentType !== 'text/csv; charset=utf-8') {
        getLog().save('get-csv-records-from-registers|wrong-content-type', { contentType });
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
      } catch (error: any) {
        getLog().save('get-csv-records-from-registers-save-document|error', {
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
      getLog().save('get-csv-records-from-registers|error', {
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
    }: any,
    eventContext: any,
  ): Promise<any> {
    const startTimeStamp = Date.now();
    const {
      documents,
      events,
      eventTemplateJsonSchemaObject: { additionalFilter },
      requestMethod = 'GET',
    } = eventContext;
    // Get additional filter function if exists.
    const additionalFilterFunction =
      typeof additionalFilter === 'string'
        ? this.sandbox.evalWithArgs(additionalFilter, [], { meta: { fn: 'additionalFilter', caller: 'LiquioProvider.getRecord' } })
        : undefined;

    const indexFieldsQuery = this.getIndexFieldsQuery({
      searchEqual,
      searchEqual2,
      searchEqual3,
      searchLike,
      searchLike2,
      searchLike3,
    });
    const effectiveLimit = additionalFilterFunction ? 100000 : limit;
    const quoteList = (list: any[]) => `[${list.map((v: any) => `"${v}"`).join(',')}]`;

    let doRequest: () => Promise<any>;

    if (requestMethod === 'GET') {
      const data: Record<string, any> = {};
      if (path && name) {
        data[path] = Array.isArray(name) ? quoteList(name) : name;
      }
      if (filters) {
        for (const filter of filters) {
          data[filter.path] = filter.name;
        }
      }
      if (filtersType === 'or') {
        data._filters_type = 'or';
      }
      const query: Record<string, any> = {
        register_id: registerId,
        key_id: keyId,
        allow_see_all_records: true,
        record_id: recordId,
        record_ids_list: Array.isArray(recordIdsList) ? quoteList(recordIdsList) : undefined,
        data,
        ...indexFieldsQuery,
        sort: sort || 'null',
        limit: effectiveLimit,
      };
      getLog().save(`${method}|requested`, { registerId, keyId, requestMethod });
      doRequest = () => this.client.getRecords(query);
    } else if (requestMethod === 'POST') {
      const body: any = {
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
        limit: effectiveLimit,
      };

      if (filters) {
        for (const filter of filters) {
          body.data[filter.path] = filter.name;
        }
      }

      getLog().save('get-records-from-registers|requested', { registerId, keyId, requestMethod });
      doRequest = () => this.client.getRecordsByPost(body);
    } else {
      throw new Error(`LiquioProvider.getRecords: Unknown requestMethod: ${requestMethod}.`);
    }

    // Do request.
    let response: any;
    try {
      response = await doRequest();
      getLog().save(`${method}|successful`, { response, registerId, keyId, path, name });
    } catch (error: any) {
      getLog().save(`${method}|error`, { error: error && error.message, registerId, keyId, path, name });
      throw this.toProviderError(error);
    }

    // Handle additional filter.
    if (Array.isArray(response?.data) && additionalFilterFunction) {
      // Use additional filter function.
      try {
        response.data = response.data.filter((record: any) => additionalFilterFunction(record, documents, events));
      } catch (error: any) {
        getLog().save(`${method}|error-calling-additional-filter-function`, {
          error: error?.message,
          registerId,
          keyId,
          path,
          name,
          additionalFilter,
        });
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
    getLog().save(`${method}|execution-time`, { registerId, keyId, additionalFilter, executionTime: `${Date.now() - startTimeStamp} ms` });

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
    }: any,
    eventContext: any,
  ): Promise<any> {
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
    }: any,
    eventContext: any,
  ): Promise<any> {
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
   * Get record.
   * @param {string} id ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async getRecord(id: string, _eventContext?: any): Promise<any> {
    getLog().save('get-from-registers|requested', { id });

    // Do request.
    let response: any;
    try {
      response = await this.client.findRecordById(id);
      getLog().save('get-from-registers|successful', { response, id });
    } catch (error: any) {
      getLog().save('get-from-registers|error', { error: error && error.message, id });
      throw this.toProviderError(error);
    }

    // Return response.
    return response;
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
  async createRecord(record: any, eventContext: any): Promise<any> {
    const accessInfo = this.getAccessInfo(eventContext);
    getLog().save('save-to-registers|requested', { registerId: record?.registerId, keyId: record?.keyId });

    // Do request.
    let response: any;
    try {
      response = { data: await this.client.createRecord(record, { accessInfo }) };
      getLog().save('saved-to-registers|successful', { response, record });
    } catch (error: any) {
      getLog().save('save-to-registers|error', { error: (error && error.message) || error, record });
      throw this.toProviderError(error);
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
  async updateRecord(id: string, record: any, eventContext: any): Promise<any> {
    // Get record.
    let existingRecordData;
    try {
      const existingRecord = await this.getRecord(id);
      existingRecordData = existingRecord && existingRecord.data;
      if (!existingRecordData) {
        throw new Error('Can not find existing record data.');
      }
    } catch (error: any) {
      getLog().save('get-data-from-registers|error', {
        error: error && error.message,
        id,
        existingRecordData,
      });
      throw error;
    }
    const newRecordData: any = { ...existingRecordData };
    for (const recordDataKey in record.data) {
      const recordDataValue = record.data[recordDataKey];
      PropByPath.set(newRecordData, recordDataKey, recordDataValue);
    }
    record.data = newRecordData;

    const accessInfo = this.getAccessInfo(eventContext);
    getLog().save('update-in-registers|requested', { id });

    // Do request.
    let response: any;
    try {
      response = { data: await this.client.updateRecordById(id, record, { accessInfo }) };
      getLog().save('updated-in-registers|successful', { response, id, record });
    } catch (error: any) {
      getLog().save('update-in-registers|error', { error: error && error.message, id, record });
      throw this.toProviderError(error);
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
  async getKeyById(id: string, _eventContext?: any): Promise<any> {
    getLog().save('get-key-from-registers|requested', { id });

    // Do request.
    let response: any;
    try {
      response = await this.client.findKeyById(id);
      getLog().save('get-key-from-registers|successful', { response, id });
    } catch (error: any) {
      getLog().save('get-key-from-registers|error', { error: error && error.message, id });
      throw this.toProviderError(error);
    }

    // Return response.
    return response;
  }

  /**
   * Delete record.
   * @param {string} id ID.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {Promise<object>}
   */
  async deleteRecord(id: string, eventContext: any): Promise<any> {
    const accessInfo = this.getAccessInfo(eventContext);
    getLog().save('delete-from-registers|requested', { id });

    // Do request.
    let response: any;
    try {
      response = { data: await this.client.deleteRecordById(id, { accessInfo }) };
      getLog().save('deleted-from-registers|successful', { response, id });
    } catch (error: any) {
      getLog().save('delete-from-registers|error', { error: error && error.message, id });
      throw this.toProviderError(error);
    }

    // Return response.
    return response;
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest(): Promise<any> {
    const result = await this.client.sendPingRequest({ withAuth: false });
    if (result === undefined) {
      getLog().save('send-ping-request-to-register', 'Ping request failed');
    }
    return result;
  }

  getIndexFieldsQuery(indexFields: any): Record<string, string> {
    const { searchEqual, searchEqual2, searchEqual3, searchLike, searchLike2, searchLike3 } = indexFields;
    const query: Record<string, string> = {
      search_equal: searchEqual,
      search_equal_2: searchEqual2,
      search_equal_3: searchEqual3,
      search: searchLike,
      search_2: searchLike2,
      search_3: searchLike3,
    };
    Object.keys(query).forEach((k) => !query[k] && delete query[k]);
    return query;
  }

  private toCsvHttpError(error: RegisterApiError): Error {
    const result: any = new Error(`Request failed with status code ${error.status}`);
    result.cause = error;
    return result;
  }

  /**
   * Convert a register client error to the error shape event callers expect.
   * @param {any} error Error.
   * @returns {any}
   */
  private toProviderError(error: any): any {
    if (error instanceof RegisterApiError && error.code === 'HTTP_ERROR') {
      const hasBody =
        error.body !== undefined && error.body !== null && error.body !== '' && !(typeof error.body === 'object' && !Object.keys(error.body).length);
      let result: Error;
      if (hasBody) {
        const prepared = Helpers.prepareResponseDataToLog(error.body);
        result = new Error(typeof prepared === 'string' ? prepared : JSON.stringify(prepared));
      } else {
        result = new Error(`Request failed with status code ${error.status}`);
      }
      (result as any).cause = error;
      return result;
    }
    return error;
  }

  /**
   * Get access info.
   * @param {{workflowId, eventTemplate, eventTemplateJsonSchemaObject, documents, events, documentModel, eventModel, filestorage}} eventContext Event context.
   * @returns {{workflowId, requestAt, ...params}} Request user ID.
   */
  getAccessInfo(eventContext: any = {}): any {
    // Define params.
    const {
      workflowId,
      eventTemplateJsonSchemaObject: { accessInfo: accessInfoObjectOrFunction },
      documents,
      events,
    } = eventContext;

    // Calc and return access info.
    const accessInfo =
      typeof accessInfoObjectOrFunction === 'string'
        ? this.sandbox.evalWithArgs(accessInfoObjectOrFunction, [documents, events], {
            meta: { fn: 'accessInfo', caller: 'LiquioProvider.getAccessInfo' },
          })
        : accessInfoObjectOrFunction || {};
    const calculatedAccessInfo = {
      workflowId,
      requestAt: new Date().toISOString(),
    };
    return {
      ...accessInfo,
      ...calculatedAccessInfo,
    };
  }
}
