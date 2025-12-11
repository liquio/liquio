import _ from 'lodash';
import deepmerge from 'deepmerge';
import { matchedData } from 'express-validator';
import { AsyncParser } from 'json2csv';
import Sequelize from 'sequelize';
import * as flattenjs from 'flattenjs';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

import { Request, Response } from '../router';
import Controller from './controller';
import SearchBusiness from '../businesses/search';
import AccessLogBusiness from '../businesses/access_log';
import HistoryBusiness from '../businesses/history';
import RecordModel from '../models/record';
import RegisterModel from '../models/register';
import KeyModel from '../models/key';
import HistoryModel from '../models/history';
import JsonSchema from '../lib/json_schema';
import KeyEntity from '../entities/key';
import typeOf from '../lib/typeOf';
import Isolation from '../lib/isolation';
import { ModelItemResponse } from '../lib/interfaces';
import RecordEntity from '../entities/record';

const ADDITIONAL_FILTER_RECORD_MAX_COUNT = 10000;
const DB_CONSTRAINT_ERROR_CODE = 'DB_CONSTRAINT_ERROR';
const SEQUELIZE_EXCLUSION_CONSTRAINT_ERROR = 'SequelizeExclusionConstraintError';

/**
 * Records controller.
 */
export default class RecordsController extends Controller {
  private static singleton: RecordsController;

  private searchBusiness: SearchBusiness;
  private accessLogBusiness: AccessLogBusiness;
  private historyBusiness: HistoryBusiness;
  private recordModel: RecordModel;
  private registerModel: RegisterModel;
  private keyModel: KeyModel;
  private historyModel: HistoryModel;

  /**
   * Records controller constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!RecordsController.singleton) {
      super(config);

      this.searchBusiness = new SearchBusiness(config);
      this.accessLogBusiness = new AccessLogBusiness(config);
      this.historyBusiness = new HistoryBusiness(config);
      this.recordModel = RecordModel.getInstance();
      this.registerModel = RegisterModel.getInstance();
      this.keyModel = KeyModel.getInstance();
      this.historyModel = HistoryModel.getInstance();

      RecordsController.singleton = this;
    }
    return RecordsController.singleton;
  }

  // Get all records.
  async getAll(req: Request, res: Response) {
    const matchedQueryData = matchedData(req, { locations: ['query'] });
    const matchedBodyData = matchedData(req, { locations: ['body'] });

    // Define params.
    const {
      offset,
      limit,
      register_id: registerId,
      key_id: keyId,
      record_id: recordId,
      allow_see_all_records,
      disable_fields_rules,
      allow_tokens: allowTokens,
      data,
      data_nested: dataNested,
      exclude,
      data_like,
      search: searchLike,
      search_2: searchLike2,
      search_3: searchLike3,
      search_equal: searchEqual,
      search_equal_2: searchEqual2,
      search_equal_3: searchEqual3,
      meta,
      created_from: createdFrom,
      created_to: createdTo,
      updated_from: updatedFrom,
      updated_to: updatedTo,
      residentship_date_from: residentshipDateFrom, // TODO: Deprecated.
      residentship_date_to: residentshipDateTo, // TODO: Deprecated.
      residentship_status_date_from: residentshipStatusDateFrom, // TODO: Deprecated.
      residentship_status_date_to: residentshipStatusDateTo, // TODO: Deprecated.
      data_date_from: dataDateFrom,
      data_date_to: dataDateTo,
      sort,
      paths,
      join_by: joinBy,
      csv_map: csvMap,
      no_limit: noLimit
    } = { offset: 0, limit: 20, ...matchedQueryData, ...matchedBodyData } as any;

    let recordIdsList;

    // Convert record_ids_list into JS array if passed via query.
    if (matchedQueryData?.record_ids_list) {
      try {
        recordIdsList = JSON.parse(matchedQueryData?.record_ids_list);
      } catch {
        return this.responseError(res, 'Error while parsing `record_ids_list` query parameter.', 400);
      }
    }
    // If record_ids_list is passed via body, it is already an array.
    if (matchedBodyData?.record_ids_list) {
      recordIdsList = matchedBodyData?.record_ids_list;
    }

    const { rawSequelizeParams } = matchedBodyData;

    let filter: RecordsGetAllFilter = {};
    let dataLike = {};
    if (!allow_see_all_records) {
      filter.allow_tokens = allowTokens && Array.isArray(allowTokens) ? allowTokens.map((v) => decodeURIComponent(v)) : [];
    }
    if (registerId) {
      filter.register_id = registerId;
    }
    if (keyId) {
      if (!(await this.keyModel.checkRecordsReadableById(keyId))) {
        return this.responseError(res, 'Key records are not readable.', 403, { keyId });
      }
      filter.key_id = keyId;
    }
    if (recordId) {
      filter.id = recordId;
    }
    if (recordIdsList) {
      filter.id = { [Sequelize.Op.in]: recordIdsList };
    }

    [searchLike, searchLike2, searchLike3, searchEqual, searchEqual2, searchEqual3].forEach((searchLikeItem, index) => {
      if (!searchLikeItem) return;

      const columnIndex = index % 3;
      const isSearchEqual = index >= 3;

      const searchPhraseList: string[] = []
        .concat(searchLikeItem)
        .flat()
        .filter((v) => v || v === 0)
        .map(String)
        .map(decodeURI)
        .map((v) => v.split('||').map((v) => v.trim()))
        .flat()
        .filter(Boolean)
        .map((v) => this.recordModel.normalizeSearchString(v));

      if (!searchPhraseList.length) return;

      const columnName = `search_string${columnIndex ? `_${columnIndex + 1}` : ''}`;

      if (isSearchEqual) {
        filter[columnName] = { [Sequelize.Op.in]: searchPhraseList };
      } else {
        if (!filter[columnName]) {
          filter[columnName] = { [Sequelize.Op.or]: [] };
        }

        searchPhraseList.forEach((searchPhrase) => {
          filter[columnName][Sequelize.Op.or].push({ [Sequelize.Op.like]: `%${searchPhrase}%` });
        });
      }
    });

    if (typeof data === 'object') {
      const normalizedData = this.formatFilterData(data);
      if (normalizedData._filters_type === 'or') {
        // OR filters.
        filter.filters_type = 'or';
        filter.data = {};
        for (const dataIndex in normalizedData) {
          if (dataIndex === '_filters_type') {
            continue;
          }
          const [dataIndexName] = dataIndex.split('|');
          if (!Array.isArray(filter.data[dataIndexName])) {
            filter.data[dataIndexName] = [];
          }
          filter.data[dataIndexName].push(normalizedData[dataIndex]);
        }
      } else {
        // AND filters (default).
        filter.data = normalizedData;
      }
    }

    // Handle dataNested.
    // Comment for search in gitlab.
    if (dataNested) {
      let type: any;
      let value: any;
      try {
        const parsedDataNested = typeof dataNested === 'object' ? dataNested : JSON.parse(dataNested);
        type = parsedDataNested.type;
        value = typeof parsedDataNested.value === 'object' ? parsedDataNested.value : JSON.parse(parsedDataNested.value);
      } catch {
        return this.responseError(res, 'Invalid dataNested parameter.', 400);
      }

      if (type === 'contains') {
        filter.data = { ...filter.data, [Sequelize.Op.contains]: value };
      } else if (type === 'includes') {
        filter.data = { ...filter.data, [Sequelize.Op.or]: [] };
        const keyList = Object.keys(value);
        if (keyList.length > 10) {
          return this.responseError(res, 'Invalid dataNested parameter. Too many fields to search.', 400);
        }
        for (const key of keyList) {
          const keyValueList = Array.isArray(value[key]) ? value[key] : [value[key]];
          if (keyValueList.length > 20) {
            return this.responseError(res, 'Invalid dataNested parameter. Too many array elements to search.', 400);
          }
          for (const keyValue of keyValueList) {
            filter.data[Sequelize.Op.or].push({ [Sequelize.Op.contains]: { [key]: [keyValue] } });
          }
        }
      } else {
        return this.responseError(res, 'Invalid dataNested type parameter.', 400);
      }
    }

    // Handle exclude.
    if (exclude) {
      let filters: any;
      try {
        filters = JSON.parse(exclude);
      } catch {
        return this.responseError(res, 'Invalid exclude parameter.', 400);
      }
      for (const property in filters) {
        filter.data = { ...filter.data, [property]: { [Sequelize.Op.notIn]: filters[property] } };
      }
    }

    if (typeof data_like === 'object') dataLike = this.createSearchQuery(data_like);
    filter.data = deepmerge(filter.data, dataLike);
    if (typeof meta === 'object') {
      filter.meta = meta;
    }

    this.recordModel.addDatesFilter(filter, {
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      residentshipDateFrom,
      residentshipDateTo,
      residentshipStatusDateFrom,
      residentshipStatusDateTo,
      dataDateFrom,
      dataDateTo
    });

    if (csvMap) {
      res.header('Content-Disposition', 'attachment; filename=records.csv');
      res.header('Content-Type', 'text/csv');
      res.write('');
    }

    if (rawSequelizeParams) {
      // Rewrite all filters.
      filter = this.prepareRawSequelizeParams(rawSequelizeParams);
    }

    // Get records.
    let recordsModelResponse;
    try {
      recordsModelResponse = await this.recordModel.getAll({
        offset: offset,
        limit: csvMap && noLimit ? undefined : Math.min(limit, this.config.pagination.maxLimit),
        filter,
        sort,
        joinBy
      });

      if (recordsModelResponse && recordsModelResponse.data) {
        const recordsKeyId = recordsModelResponse.data[0] && recordsModelResponse.data[0].keyId;
        const { data: key } = (recordsKeyId && (await this.keyModel.findById(recordsKeyId))) || {};

        // Safeguard for a potential case when getAll is called without keyId (this shouldn't happen)
        if (key instanceof KeyEntity && !this.keyModel.checkRecordsReadable(key)) {
          return this.responseError(res, 'Key records are not readable.', 403, { keyId });
        }

        for (const recordModelResponse of recordsModelResponse.data) {
          // Filter not allowed properties.
          if (!allow_see_all_records) {
            recordModelResponse.applyColumnLevelSecurity(key, allowTokens);
            recordModelResponse.applyColumnLevelSecurity(key, allowTokens);
          }

          if (!disable_fields_rules && !allow_see_all_records) {
            recordModelResponse.applyResponseFieldsRules(key);
          }

          // Get only needed paths.
          if (recordModelResponse.data && paths) {
            const pathsList = Array.isArray(paths) ? paths : [paths];
            recordModelResponse.filterEntity(pathsList);
          }
        }
      }
    } catch (error) {
      this.log.save('get-records-error', { error: error && error.message });
      return this.responseError(res, error.message, 500);
    }
    const { data: records, meta: modelResponseMeta } = recordsModelResponse || {};
    this.accessLogBusiness.saveIfNeedIt(records, req.accessInfo);

    // Check validation identity
    try {
      await this.checkValidationIdentity('GET', keyId, records);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 500);
    }

    // Response.
    if (csvMap) {
      let csvMapParsed;
      try {
        csvMapParsed = JSON.parse(csvMap);
      } catch (error) {
        this.log.save('csv-map-parse-error', { error: error?.message });
        res.write('Invalid csvMap parameter.');
        return res.end();
      }

      const asyncParser = new AsyncParser({
        quote: '',
        fields: Object.keys(csvMapParsed)
      });

      asyncParser.processor
        .on('end', () => {
          res.end();
        })
        .pipe(res);

      const csvEntries = Object.entries(csvMapParsed);

      for (const record of records) {
        const row = csvEntries.reduce(
          (t, [key, value]) => ({
            ...t,
            [key]: `"${`${_.get(record, value as string) || ''}`.replace(/"/g, '\\"')}"`
          }),
          {}
        );
        asyncParser.input.push(JSON.stringify(row));
      }

      asyncParser.input.push(null);
    } else {
      this.responseData(res, records, modelResponseMeta);
    }
  }

  // Get all filtered records.
  async getAllFiltered(req: Request, res: Response) {
    // Define params.
    const {
      register_id: registerId,
      key_id: keyId,
      id: recordId,
      allow_see_all_records,
      disable_fields_rules,
      allow_tokens: allowTokens,
      data,
      data_like,
      search,
      search_2: search2,
      search_3: search3,
      search_equal: searchEqual,
      search_equal_2: searchEqual2,
      search_equal_3: searchEqual3,
      meta,
      created_from: createdFrom,
      created_to: createdTo,
      updated_from: updatedFrom,
      updated_to: updatedTo,
      changed_from: changedFrom,
      changed_to: changedTo,
      sort,
      csv_map: csvMap,
      no_limit: noLimit,
      limit: responseLimit = 20,
      offset: responseOffset = 0,
      additional_filter: queryAdditionalFilter
    } = matchedData(req, { locations: ['query'] });
    const { additionalFilter: bodyAdditionalFilter, additionalFilterData } = matchedData(req, { locations: ['body'] });

    const additionalFilter = queryAdditionalFilter
      ? Buffer.from(decodeURIComponent(queryAdditionalFilter), 'base64').toString('utf8')
      : bodyAdditionalFilter;

    let sqlLimit;
    if (csvMap && noLimit) {
      sqlLimit = this.config.pagination.maxLimit;
    } else {
      sqlLimit = !additionalFilter ? responseLimit : Math.min(this.config.pagination.packetLimit || 100, this.config.pagination.maxLimit);
    }

    let sqlOffset = !additionalFilter ? responseOffset : 0;
    const { element = {}, step = {}, document = {} } = additionalFilterData || {};
    const filter: RecordsGetAllFilteredFilter = {};
    let dataLike = {};
    if (!allow_see_all_records) {
      filter.allow_tokens = allowTokens && Array.isArray(allowTokens) ? allowTokens.map((v) => decodeURIComponent(v)) : [];
    }
    if (registerId) filter.register_id = registerId;
    if (keyId) {
      if (!(await this.keyModel.checkRecordsReadableById(keyId))) {
        return this.responseError(res, 'Key records are not readable.', 403, { keyId });
      }
      filter.key_id = keyId;
    }
    if (recordId) filter.id = recordId;
    if (typeof data === 'object') {
      if (data._filters_type === 'or') {
        // OR filters.
        filter.filters_type = 'or';
        filter.data = {};
        for (const dataIndex in data) {
          if (['_filters_type', '_ignore_case'].includes(dataIndex)) {
            continue;
          }
          const [dataIndexName] = dataIndex.split('|');
          if (!Array.isArray(filter.data[dataIndexName])) {
            filter.data[dataIndexName] = [];
          }
          filter.data[dataIndexName].push(data[dataIndex]);
        }
      } else {
        filter.data = data;
      }
      // Check if empty array should be responsed.
      const { wrongValues: wrongFilterValues } = this.config.filters;
      if (Object.values(data).some((v) => wrongFilterValues.includes(v))) {
        return this.responseData(res, [], { count: 0, limit: sqlLimit, offset: responseOffset });
      }
    }
    if (typeof meta === 'object') filter.meta = meta;
    if (typeof data_like === 'object') dataLike = this.createSearchQuery(data_like);

    [search, search2, search3, searchEqual, searchEqual2, searchEqual3].forEach((searchLikeItem, index) => {
      if (!searchLikeItem) return;

      const columnIndex = index % 3;
      const isSearchEqual = index >= 3;

      const searchPhraseList: string[] = []
        .concat(searchLikeItem)
        .flat()
        .filter((v) => v || v === 0)
        .map(String)
        .map(decodeURI)
        .map((v) => v.split('||').map((v) => v.trim()))
        .flat()
        .filter(Boolean)
        .map((v) => this.recordModel.normalizeSearchString(v));

      if (!searchPhraseList.length) return;

      const columnName = `search_string${columnIndex ? `_${columnIndex + 1}` : ''}`;

      if (isSearchEqual) {
        filter[columnName] = { [Sequelize.Op.in]: searchPhraseList };
      } else {
        if (!filter[columnName]) {
          filter[columnName] = { [Sequelize.Op.or]: [] };
        }

        searchPhraseList.forEach((searchPhrase) => {
          filter[columnName][Sequelize.Op.or].push({ [Sequelize.Op.like]: `%${searchPhrase}%` });
        });
      }
    });

    if (dataLike) {
      filter.data_like = dataLike;
    }

    this.recordModel.addDatesFilter(filter, { createdFrom, createdTo, updatedFrom, updatedTo });

    // Get records.
    const responseRecords = [];
    let recordsModelResponse;
    let records;
    let modelResponseMeta;
    let responseOffsetCount = 0;
    let stop = false; // Set `true` if all records are fetched.

    const isolate = new Isolation();
    isolate.set('element', element).set('step', step).set('document', document).eval(`
        const additionalFilter = ${additionalFilter};
        element = element.copySync();
        step = step.copySync();
        document = document.copySync();
      `);
    while (responseRecords.length < sqlLimit && !stop) {
      if (!additionalFilter) {
        stop = true;
      }
      try {
        recordsModelResponse = await this.recordModel.getAll({
          offset: sqlOffset,
          limit: sqlLimit,
          filter,
          sort,
          changedFrom,
          changedTo
        });

        if (recordsModelResponse && recordsModelResponse.data) {
          const recordsKeyId = recordsModelResponse.data[0] && recordsModelResponse.data[0].keyId;
          const { data: key } = (recordsKeyId && (await this.keyModel.findById(recordsKeyId, { cacheTime: 1 }))) || {};

          // Safeguard for a potential case when getAll is called without keyId (this shouldn't happen)
          if (key instanceof KeyEntity && !this.keyModel.checkRecordsReadable(key)) {
            return this.responseError(res, 'Key records are not readable.', 403, { keyId });
          }

          for (const recordModelResponse of recordsModelResponse.data) {
            // Filter not allowed properties.
            if (!allow_see_all_records) {
              recordModelResponse.applyColumnLevelSecurity(key, allowTokens);
            }

            if (!disable_fields_rules && !allow_see_all_records) {
              recordModelResponse.applyResponseFieldsRules(key);
            }
          }
        }
      } catch (error) {
        this.log.save('get-records-error', { error: error && error.message });
        return this.responseError(res, error.message, 500);
      }
      records = recordsModelResponse.data;
      if (!modelResponseMeta) modelResponseMeta = recordsModelResponse.meta;

      // Break if empty database response.
      if (recordsModelResponse.data.length === 0) break;
      if (recordsModelResponse.data.length < sqlLimit) stop = true;

      // Choose records from response if additionalFilter returns `true`.
      // Postcondition Filtering.
      for (const record of records) {
        // If already filled response.
        if (responseRecords.length === sqlLimit) break;

        // Check if record count less than limit if additionalFilter is set. #14188
        if (responseRecords.length > ADDITIONAL_FILTER_RECORD_MAX_COUNT) {
          this.log.save('get-records-filtered-additional-filter-error', {
            recordsCount: responseRecords.length,
            maxRecordsCount: ADDITIONAL_FILTER_RECORD_MAX_COUNT
          });
          return this.responseError(res, 'To many records for additional filter.');
        }
        // If filter is not match.
        if (additionalFilter) {
          try {
            const filter = isolate.set('record', record).eval(`additionalFilter(record.copySync(), element, step, document)`);

            if (!filter) {
              modelResponseMeta.count--;
              continue;
            }
          } catch (error) {
            this.log.save('get-records-filtered-additional-filter-error', {
              error: error.message,
              additionalFilter,
              record: record.toJSON()
            });
            return this.responseError(res, `Internal Error. Additional filter error. ${error.message}.`);
          }
        }

        // Check offset.
        if (additionalFilter && responseOffsetCount < responseOffset) {
          responseOffsetCount++;
        } else {
          responseRecords.push(record);
        }
      }
      sqlOffset += sqlLimit;
    }

    // Check validation identity
    try {
      await this.checkValidationIdentity('GET', keyId, responseRecords);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 500);
    }

    // Response.
    this.accessLogBusiness.saveIfNeedIt(responseRecords, req.accessInfo);

    // Response.
    if (csvMap) {
      res.header('Content-Disposition', 'attachment; filename=records.csv');
      res.header('Content-Type', 'text/csv');
      res.write('');

      let csvMapParsed;
      try {
        csvMapParsed = JSON.parse(csvMap);
      } catch (error) {
        this.log.save('csv-map-parse-error', { error: error?.message });
        res.write('Invalid csvMap parameter.');
        return res.end();
      }

      const asyncParser = new AsyncParser({
        quote: '',
        fields: Object.keys(csvMapParsed)
      });

      asyncParser.processor
        .on('end', () => {
          res.end();
        })
        .pipe(res);

      const csvEntries = Object.entries(csvMapParsed);

      for (const record of responseRecords) {
        const row = csvEntries.reduce(
          (t, [key, value]) => ({
            ...t,
            [key]: `"${`${_.get(record, value as string) || ''}`.replace(/"/g, '\\"')}"`
          }),
          {}
        );
        asyncParser.input.push(JSON.stringify(row));
      }

      asyncParser.input.push(null);
    } else {
      this.responseData(res, responseRecords, { ...modelResponseMeta, limit: responseLimit, offset: responseOffset });
    }
  }

  // Find a record by ID.
  async findById(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const { paths, allow_tokens: allowTokens } = matchedData(req, { locations: ['query'] });

    // Get record.
    let recordModelResponse;
    try {
      recordModelResponse = await this.recordModel.findById(id);

      // Column-level security.
      const recordKeyId = recordModelResponse && recordModelResponse.data && recordModelResponse.data.keyId;
      if (recordKeyId && allowTokens) {
        const { data: key } = (recordKeyId && (await this.keyModel.findById(recordKeyId))) || {};

        if (!this.keyModel.checkRecordsReadable(key)) {
          return this.responseError(res, 'Key records are not readable.', 403, { keyId: key.id });
        }

        recordModelResponse.data.applyColumnLevelSecurity(key, allowTokens).applyResponseFieldsRules(key);
      }

      // Response paths filter.
      if (recordModelResponse && recordModelResponse.data && paths) {
        recordModelResponse.data.filterEntity(paths);
      }
    } catch (error) {
      this.log.save('get-record-by-id-error', { error: error && error.message });
    }
    const { data: record } = recordModelResponse || {};

    // Check.
    if (!record) {
      return this.responseError(res, 'Not found.', 404);
    }
    this.accessLogBusiness.saveIfNeedIt([record], req.accessInfo);

    // Check validation identity
    try {
      await this.checkValidationIdentity('GET', record.keyId, [record]);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 500);
    }

    this.responseData(res, record);
  }

  // Bulk import of records.
  async bulkImport(req: Request, res: Response) {
    // Define params. Records format: `{ id?, data, meta?, allowTokens? }[]`.
    let {
      registerId,
      keyId,
      records,
      background,
      isCalculateSearchStrings = false,
      updateByDataField,
      isReturnCreatedRecords
    } = matchedData(req, { locations: ['body'] });
    const { user } = req.auth;

    // Check records.
    if (!Array.isArray(records) || !records.every((v) => typeof v === 'object' && v !== null && typeof v.data === 'object')) {
      return this.responseError(res, 'Can not import. All records should be defined as objects.', 500);
    }

    // Check if register exists.
    try {
      const registerModelResponse = await this.registerModel.findById(registerId);
      if (!registerModelResponse) {
        this.log.save('bulk-import-records-register-is-not-exists');
        return this.responseError(res, 'Register does not exist.', 400);
      }
    } catch (error) {
      this.log.save('bulk-import-records-try-to-find-register', { error: error.toString() });
      return this.responseError(res, 'Error while fetching register.', 500);
    }

    // Check key exists.
    let keyModelResponse;
    let isKeyEncrypted = false;
    try {
      keyModelResponse = await this.keyModel.findById(keyId);
      if (!keyModelResponse) {
        this.log.save('bulk-import-records-key-is-not-exists');
        return this.responseError(res, 'Key does not exist.', 400);
      }
      isKeyEncrypted = keyModelResponse.data && keyModelResponse.data.isEncrypted;
    } catch (error) {
      this.log.save('bulk-import-records-try-to-find-key', { error: error.toString() });
      return this.responseError(res, 'Error while fetching key.', 500);
    }

    if (!this.keyModel.checkRecordsWritable(keyModelResponse.data)) {
      return this.responseError(res, 'Key records are not writable.', 403);
    }

    if (isCalculateSearchStrings) {
      const {
        data: { toSearchString = '() => { return "" }' }
      } = keyModelResponse;
      records = records.map((record) => {
        const isolate = new Isolation();
        const toSearchStringResult = isolate.set('data', record.data).eval(`(${toSearchString})({ data: data })`);
        if (Array.isArray(toSearchStringResult)) {
          const [searchString, searchString2, searchString3] = toSearchStringResult;
          return { ...record, searchString, searchString2, searchString3 };
        } else {
          return { ...record, searchString: toSearchStringResult };
        }
      });
    }

    // Define records to import.
    let recordsToImport = [];
    if (!updateByDataField) {
      recordsToImport = records
        .filter((v) => !v.id)
        .map((v) => ({
          meta: {},
          allowTokens: [],
          ...v,
          registerId,
          searchString: isCalculateSearchStrings ? v.searchString : v.data && v.data.fullTextAddress,
          keyId,
          user,
          isEncrypted: isKeyEncrypted
        }));
    }

    // Define records to update.
    let recordsToUpdate = [];
    if (!updateByDataField) {
      recordsToUpdate =
        global.typeOf(updateByDataField) === 'string'
          ? []
          : records
              .filter((v) => v.id)
              .map((v) => ({
                meta: {},
                allowTokens: [],
                ...v,
                registerId,
                keyId,
                user,
                isEncrypted: isKeyEncrypted
              }));
    }

    // Define records to update by data field.
    let recordsToUpdateByDataField = [];
    if (updateByDataField) {
      recordsToUpdateByDataField = records
        .filter((v) => !!v.data[updateByDataField])
        .map((v) => ({
          meta: {},
          allowTokens: [],
          ...v,
          registerId,
          keyId,
          user
        }));
    }

    // Response if background.
    if (background) {
      // Response.
      this.responseData(
        res,
        {
          keyRecords: records.length,
          recordsToImport: recordsToImport.length,
          recordsToUpdate: recordsToUpdate.length
        },
        undefined,
        202
      );
    }

    // Create records.
    let importedRecords: number | RecordEntity[] = isReturnCreatedRecords ? [] : 0;
    try {
      importedRecords = await this.recordModel.bulkCreate(recordsToImport, isReturnCreatedRecords);
    } catch (error) {
      this.log.save('bulk-create-records-error', { error: error && error.message });
    }

    // Update records by primary key.
    let updatedRecords = 0;
    for (const recordToUpdate of recordsToUpdate) {
      const { id } = recordToUpdate;
      try {
        await this.recordModel.update(id, recordToUpdate);
        updatedRecords++;
      } catch (error) {
        this.log.save('update-record-error', { error: error && error.message, recordToUpdate });
      }
    }

    // Update records by data field.
    let updatedRecordsByDataField = 0;
    for (const recordToUpdateByDataField of recordsToUpdateByDataField) {
      try {
        await this.recordModel.updateByDataField({
          keyId,
          registerId,
          record: recordToUpdateByDataField,
          dataFieldName: updateByDataField,
          dataFieldValue: recordToUpdateByDataField.data[updateByDataField]
        });
        updatedRecordsByDataField++;
      } catch (error) {
        this.log.save('update-record-error', { error: error && error.message, recordToUpdateByDataField });
      }
    }

    // Response if not background.
    if (!background) {
      this.responseData(res, {
        keyRecords: records.length,
        recordsToImport: recordsToImport.length,
        recordsToUpdate: recordsToUpdate.length,
        importedRecords,
        updatedRecords,
        updatedRecordsByDataField
      });
    }
  }

  // Bulk create records by person.
  async bulkCreateByPerson(req: Request, res: Response) {
    const { registerId, keyId, recordsData, person, isDisableHooks = false } = matchedData(req, { locations: ['body'] });
    const { user: basicAuthUser } = req.auth;

    // Check records.
    if (global.typeOf(recordsData) !== 'array' || !recordsData.every((v) => global.typeOf(v) === 'object')) {
      return this.responseError(res, 'Can not create. All records should be defined as objects.', 500);
    }

    // Check register exists.
    try {
      const registerModelResponse = await this.registerModel.findById(registerId);
      if (!registerModelResponse) {
        this.log.save('bulk-create-records-by-person-register-is-not-exists');
        return this.responseError(res, 'Register is not exists.', 400);
      }
    } catch (error) {
      this.log.save('bulk-create-records-by-person-try-to-find-register', { error: error.toString() });
      return this.responseError(res, 'Error while fetching register.', 500);
    }

    // Check key exists.
    let keyModelResponse;
    try {
      keyModelResponse = await this.keyModel.findById(keyId);
      if (!keyModelResponse) {
        this.log.save('bulk-create-records-by-person-key-is-not-exists');
        return this.responseError(res, 'Key is not exists.', 400);
      }
    } catch (error) {
      this.log.save('bulk-create-records-by-person-try-to-find-key', { error: error.toString() });
      return this.responseError(res, 'Error while fetching key.', 500);
    }

    if (!this.keyModel.checkRecordsWritable(keyModelResponse.data)) {
      return this.responseError(res, 'Key records are not writable.', 403);
    }

    const {
      data: { toSearchString: toSearchStringFunction = '() => { return "" }' }
    } = keyModelResponse;

    // Create records.
    let createdRecords;
    try {
      const recordsToCreate = recordsData.map((data) => {
        const isolate = new Isolation();
        const toSearchString = isolate.set('toSearchStringFunction', toSearchStringFunction).set('data', data).eval(`toSearchStringFunction({ data: data })`);
        const [searchString = null, searchString2 = null, searchString3 = null] =
          global.typeOf(toSearchString) === 'array' ? toSearchString : [toSearchString];
        return {
          registerId,
          keyId,
          data: data,
          meta: { person },
          user: basicAuthUser,
          allowTokens: [],
          searchString: searchString,
          searchString2: searchString2,
          searchString3: searchString3,
          signature: null
        };
      });
      createdRecords = await this.recordModel.bulkCreate(recordsToCreate, true, isDisableHooks);
    } catch (error) {
      this.log.save('bulk-create-records-by-person-error', { error: error && error.message });
      if (error.name === SEQUELIZE_EXCLUSION_CONSTRAINT_ERROR) {
        error.code = DB_CONSTRAINT_ERROR_CODE;
      }
      return this.responseError(res, error);
    }

    return this.responseData(res, { createdRecords });
  }

  // Bulk delete records.
  async deleteBulk(req: Request, res: Response) {
    const { registerId, keyId, skipRecordIds } = matchedData(req, { locations: ['body'] });

    try {
      const register = await this.registerModel.findById(registerId);
      if (!register) {
        return this.responseError(res, `Register with id ${registerId} does not exist.`, 400);
      }

      const key = await this.keyModel.findById(keyId);
      if (!key) {
        return this.responseError(res, `Key with id ${keyId} does not exist.`, 400);
      }
      if (!this.keyModel.checkRecordsWritable(key.data)) {
        return this.responseError(res, 'Key records are not writeable.', 403);
      }

      if (skipRecordIds.length === 0) {
        return this.responseError(res, 'Skip record ids is empty.', 400);
      }

      // Remove records.
      this.log.save('bulk-delete-records-start', { registerId, keyId, skipRecordIds });
      const result = await this.recordModel.bulkDelete(
        {
          register_id: registerId,
          key_id: keyId,
          id: { [Sequelize.Op.notIn]: skipRecordIds }
        },
        undefined,
        () => {}
      );
      this.log.save('bulk-delete-records-end', result);

      this.responseData(res, {
        removedRecords: result.removedRecords,
        nonRemovedRecords: result.nonRemovedRecords
      });
    } catch (error) {
      this.log.save('bulk-delete-records-error', {
        error: error && error.message,
        registerId,
        keyId,
        skipRecordIds
      });
      return this.responseError(res, 'Error while deleting records.', 500);
    }
  }

  // Find record history by record ID.
  async findHistoryByRecordId(req: Request, res: Response) {
    // Define params.
    const { id: recordId } = matchedData(req, { locations: ['params'] });
    const {
      operation,
      split_by_fields: splitByFields = false,
      split_by_fields_order: splitByFieldsOrder = 'asc',
      offset,
      limit
    } = { offset: 0, limit: 20, ...matchedData(req, { locations: ['query'] }) } as any;

    // Get history records.
    let historyModelResponse;
    try {
      historyModelResponse = await this.historyModel.getByRecordId(recordId, { offset, limit, operation });
    } catch (error) {
      this.log.save('get-history-by-record-id-error', { error: error && error.message });
    }
    const { data: historyList, meta } = historyModelResponse || {};

    // Check.
    if (!historyList) {
      return this.responseError(res, 'Not found.', 404);
    }

    if (historyList.length > 0 && historyList[0].keyId) {
      const keyId = historyList[0].keyId;
      if (!(await this.keyModel.checkRecordsReadableById(keyId))) {
        return this.responseError(res, 'Key records are not readable.', 403, { keyId });
      }
    }

    // Response.
    const historyToReturn = splitByFields ? this.historyBusiness.splitByFields(historyList, splitByFieldsOrder) : historyList;
    this.responseData(res, historyToReturn, meta);
  }

  // Create a record.
  async create(req: Request, res: Response) {
    // Define params.
    const { registerId, keyId, allowTokens, data, meta, person, signature } = matchedData(req, { locations: ['body'] });

    let allowTokensFiltered = undefined;

    if (!!allowTokens && Array.isArray(allowTokens)) {
      if (allowTokens.length === 0) {
        allowTokensFiltered = [];
      } else if (allowTokens.filter(Boolean).length > 0) {
        allowTokensFiltered = [].concat(allowTokens).filter(Boolean); // Filters out null's and undefined's
      }
    }

    const { user } = req.auth;

    // Get key.
    let keyModelResponse: Awaited<ReturnType<typeof KeyModel.prototype.findById>>;
    {
      let key;
      try {
        keyModelResponse = await this.keyModel.findById(keyId);
        if (!keyModelResponse) {
          return this.responseError(res, 'Can not find key.', 404);
        }
        key = keyModelResponse.data;
      } catch (error) {
        this.log.save('create-record-key-error', { error: error && error.message });
        return this.responseError(res, error, 500);
      }
      if (!this.keyModel.checkRecordsWritable(key)) {
        return this.responseError(res, 'Key records are not writeable.', 403);
      }
    }

    // Validate.
    try {
      const { data: { schema } = {} } = keyModelResponse;
      const jsonSchema = new JsonSchema(schema);
      const validatorErrors = await jsonSchema.check(data, keyId);
      if (validatorErrors.length > 0) {
        return this.responseError(res, 'JSON schema validation error.', 400, validatorErrors);
      }
    } catch (error) {
      this.log.save('create-record-schema-error', { error: error && error.message });
      return this.responseError(res, 'Invalid JSON schema.', 400, error.toString());
    }

    // Check validation identity
    try {
      await this.checkValidationIdentity('CREATE', keyId, undefined, data, signature);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 400);
    }

    // Check XSS.
    try {
      this.checkXss(data);
    } catch (error) {
      this.log.save('create-record-error|detected-xss', { error: error.toString() });
      return this.responseError(res, 'Create record error. Detected potential XSS.', 400, { error: error.toString() });
    }

    // Search string function.
    const toSearchString = keyModelResponse.data.toSearchString || '(record) => { return null; }';
    let searchString;
    let searchString2;
    let searchString3;
    try {
      const isolate = new Isolation();
      const searchStrings = isolate.set('data', data).eval(`(${toSearchString})({ data: data })`);
      if (Array.isArray(searchStrings)) {
        searchString = searchStrings[0];
        searchString2 = searchStrings[1];
        searchString3 = searchStrings[2];
      } else {
        searchString = searchStrings;
      }
      if (searchString.length > 255) {
        return this.responseError(res, 'Max length 255 for searchString.', 400);
      }
    } catch (error) {
      this.log.save('create-record-search-string-function-error', { error: error && error.message });
    }

    // Create records.
    const historyMeta = { accessInfo: req.accessInfo || {} };
    let recordModelResponse: ModelItemResponse<RecordEntity>;
    try {
      recordModelResponse = await this.recordModel.create(
        {
          registerId,
          keyId,
          allowTokens: allowTokensFiltered,
          data,
          meta,
          user,
          searchString,
          searchString2,
          searchString3,
          person,
          signature,
          isEncrypted: keyModelResponse.data.isEncrypted
        } as any,
        true,
        historyMeta
      );
    } catch (error) {
      this.log.save('create-record-error', { error: error && error.message });
      return this.responseError(res, 'Create record error.', 400, error.message);
    }
    const { data: record } = recordModelResponse || {};

    // Check.
    if (!record) {
      return this.responseError(res, 'Can not create.', 500);
    }

    // Response.
    this.responseData(res, record);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const { registerId, keyId, data, meta, person, signature, allowTokens } = matchedData(req, { locations: ['body'] });
    let allowTokensFiltered = undefined;

    if (!!allowTokens && Array.isArray(allowTokens)) {
      if (allowTokens.length === 0) {
        allowTokensFiltered = [];
      } else if (allowTokens.filter(Boolean).length > 0) {
        allowTokensFiltered = [].concat(allowTokens).filter(Boolean); // Filters out null's and undefined's
      }
    }
    const { user } = req.auth;
    let modelResponse: Awaited<ReturnType<typeof KeyModel.prototype.findById>>;

    // Validate.
    try {
      modelResponse = await this.keyModel.findById(keyId);
      if (!modelResponse) {
        return this.responseError(res, 'Can not find key.', 404);
      }
      if (!this.keyModel.checkRecordsWritable(modelResponse.data)) {
        return this.responseError(res, 'Key records are not writeable.', 403);
      }
      const { data: { schema } = {} } = modelResponse;
      const jsonSchema = new JsonSchema(schema);
      const validatorErrors = await jsonSchema.check(data, keyId, id);
      if (validatorErrors.length > 0) {
        return this.responseError(res, 'JSON schema validation error.', 400, validatorErrors);
      }
    } catch (error) {
      this.log.save('update-record-schema-error', { error: error && error.message });
      return this.responseError(res, 'JSON schema validation error.', 500, 'Cannot validate record data');
    }

    // Check validation identity
    try {
      await this.checkValidationIdentity('UPDATE', keyId, undefined, data, signature);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 400);
    }

    // Check XSS.
    try {
      this.checkXss(data);
    } catch (error) {
      this.log.save('update-record-error|detected-xss', { error: error.toString() });
      return this.responseError(res, 'Update record error. Detected potential XSS.', 400, { error: error.toString() });
    }

    // Search string function.
    const toSearchString = modelResponse.data.toSearchString || '(record) => { return null; }';
    let searchString;
    let searchString2;
    let searchString3;
    try {
      const isolate = new Isolation();
      const searchStrings = isolate.set('data', data).eval(`(${toSearchString})({ data: data })`);
      if (Array.isArray(searchStrings)) {
        searchString = searchStrings[0];
        searchString2 = searchStrings[1];
        searchString3 = searchStrings[2];
      } else {
        searchString = searchStrings;
      }
    } catch (error) {
      this.log.save('update-record-search-string-function-error', { error: error && error.message });
    }

    // Update records.
    const historyMeta = { accessInfo: req.accessInfo || {} };
    const recordToUpdate = {
      id,
      registerId,
      keyId,
      data,
      meta,
      user,
      searchString,
      searchString2,
      searchString3,
      person,
      signature,
      isEncrypted: modelResponse.data.isEncrypted,
      allowTokens: allowTokensFiltered
    };
    let recordModelResponse;
    try {
      recordModelResponse = await this.recordModel.update(id, recordToUpdate, true, historyMeta);
    } catch (error) {
      this.log.save('update-record-error', { error: error && error.message, recordToUpdate });
    }
    const { data: record } = recordModelResponse || {};

    // Check.
    if (!record) {
      return this.responseError(res, 'Can not update.', 500);
    }

    // Response.
    this.responseData(res, record);
  }

  /**
   * Update props.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updatePatch(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const { keyId, properties } = matchedData(req, { locations: ['body'] });

    // Check validation identity
    try {
      await this.checkValidationIdentity('BLOCK', keyId);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 400);
    }

    if (!(await this.keyModel.checkRecordsWritableById(keyId))) {
      return this.responseError(res, 'Key records are not writable.', 403);
    }

    try {
      const recordModelResponse = await this.recordModel.updatePatch(id, keyId, properties);
      if (!recordModelResponse) {
        return this.responseError(res, 'Cannot update.', 500);
      }

      this.responseData(res, recordModelResponse);
    } catch (error) {
      this.log.save('update-record-status-error', { error: error?.message, properties });
    }
  }

  /**
   * Search.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async search(req, res) {
    // Define params.
    const { key_id: keyId, text, search_key: searchKey, allow_tokens: allowTokens, limit, offset = 0 } = matchedData(req, { locations: ['query'] });
    const { main: mainSearchConfig, [keyId]: specificSearchConfig } = this.config.search;

    if (!(await this.keyModel.checkRecordsReadableById(keyId))) {
      return this.responseError(res, 'Key records are not readable.', 403, { keyId });
    }
    const keyModelResponse = await this.keyModel.findById(keyId);
    if (keyModelResponse.data.isEncrypted) {
      return this.responseError(res, 'Search is not allowed for encrypted keys.', 400);
    }

    // Define search params.
    const searchConfig = specificSearchConfig || mainSearchConfig;
    const { resultsCount = 10 } = searchConfig;
    const recordSearchKey = searchKey ? `data.${searchKey}` : 'search_string';
    let textList;
    try {
      textList = this.searchBusiness.getTextList(text, searchConfig);
    } catch (error) {
      this.log.save('search-record-error', { error: error && error.message, stack: error && error.stack });
      return this.responseError(res, 'Wrong request');
    }

    // Find records.
    let records;
    try {
      records = await this.recordModel.search(keyId, recordSearchKey, textList, limit || resultsCount, offset);

      // Column-level security.
      const recordsKeyId = records.data && records.data[0] && records.data[0].keyId;
      if (recordsKeyId && allowTokens) {
        const { data: key } = (recordsKeyId && (await this.keyModel.findById(recordsKeyId))) || {};
        for (const recordModelResponse of records.data) {
          recordModelResponse.applyColumnLevelSecurity(key, allowTokens).applyResponseFieldsRules(key);
        }
      }
    } catch (error) {
      this.log.save('search-record-error', { error: error && error.message, stack: error && error.stack });
    }

    // Check.
    if (!records) {
      return this.responseError(res, 'Searching error.', 500);
    }

    this.accessLogBusiness.saveIfNeedIt(records && records.data, req.accessInfo);

    // Check validation identity
    try {
      await this.checkValidationIdentity('GET', keyId, records.data);
    } catch (error) {
      this.log.save('check-validation-identity-error', { error: error.message, details: error.details });
      return this.responseError(res, error.message, 500);
    }

    // Response.
    this.responseData(res, records);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const { user } = req.auth;
    const { personId, personName } = matchedData(req, { locations: ['query'] });
    const person = personId && personName ? { personId, personName } : undefined;

    // Delete record.
    const historyMeta = { accessInfo: req.accessInfo || {} };
    let deletedRowsCountModelResponse;
    try {
      const record = await this.recordModel.findById(id);
      if (!record || !record.data) {
        return this.responseError(res, 'Can not find record.', 404);
      }
      const modelResponse = await this.keyModel.findById(record.data.keyId);
      if (!modelResponse) {
        return this.responseError(res, 'Can not find key.', 404);
      }
      if (!this.keyModel.checkRecordsWritable(modelResponse.data)) {
        return this.responseError(res, 'Key records are not writeable.', 403);
      }
      deletedRowsCountModelResponse = await this.recordModel.delete(id, user, person, historyMeta);
    } catch (error) {
      this.log.save('delete-record-error', { error: error && error.message });
    }
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};

    // Check.
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Can not delete.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }

  formatFilterData(data: any) {
    for (const dataKey in data) {
      try {
        // If array.
        if (Array.isArray(data[dataKey])) {
          if (data[dataKey].includes('null')) {
            data[dataKey] = {
              [Sequelize.Op.or]: [{ [Sequelize.Op.in]: data[dataKey].filter((v) => v !== 'null') }, { [Sequelize.Op.is]: null }]
            };
          } else {
            data[dataKey] = { [Sequelize.Op.in]: data[dataKey] };
          }
        }

        // If stringified array.
        const parsed = JSON.parse(data[dataKey]);
        if (Array.isArray(parsed)) data[dataKey] = { [Sequelize.Op.in]: parsed };
      } catch {
        // Do nothing.
      }

      // If object.

      if (typeof data[dataKey] === 'object') {
        data[dataKey] = this.formatFilterData(data[dataKey]);
      }

      if (data[dataKey] === 'null') data[dataKey] = null;
    }

    return data;
  }

  createSearchQuery(data: any) {
    const dataToSearch = JSON.parse(JSON.stringify(data));
    for (const dataKey in dataToSearch) {
      let dataValue = dataToSearch[dataKey];
      const nestedPath = dataKey.split('.');
      switch (true) {
        // If string or number.
        case typeof dataValue === 'string' || typeof dataValue === 'number':
          dataValue = { [Sequelize.Op.iLike]: `%${dataValue}%` };
          _.set(dataToSearch, nestedPath, dataValue);
          if (nestedPath.length > 1) {
            delete dataToSearch[dataKey];
          }
          break;
        // If nested object.
        case typeof dataValue === 'object':
          dataToSearch[dataKey] = this.createSearchQuery(dataToSearch[dataKey]);
          break;
      }
    }

    return dataToSearch;
  }

  private recursiveSort(obj: any) {
    if (typeof obj != 'object' || obj instanceof Array || obj instanceof Date) {
      return obj;
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return obj;
    }
    const sortedObject = {};
    keys.sort().forEach((key) => (sortedObject[key] = this.recursiveSort(obj[key])));

    return sortedObject;
  }

  private async checkValidationIdentity(
    type: 'GET' | 'CREATE' | 'UPDATE' | 'BLOCK',
    keyId: number,
    records: RecordEntity[] = [],
    recordData?: any,
    signature?: any
  ) {
    if (type === 'GET') {
      const validationIdentity = global.config?.key_signature[keyId]?.validationIdentity;
      if (validationIdentity) {
        for (const record of records) {
          if (!record.signature) {
            throw new Error(`Internal Error. BPMN Register. Record ${record.id} has no signature. Key ${record.keyId} signature required`);
          }
          try {
            // PostgreSQL JSONB type has its own sort format. We need alphabetical sorting to correctly verify the signature.
            const sortedData = this.recursiveSort(record.data);

            const recordDataInBase64 = Buffer.from(JSON.stringify(sortedData)).toString('base64');
            await this.sign.verifySignatureExternal(recordDataInBase64, record.signature);
          } catch (error) {
            throw new Error(
              `Internal Error. BPMN Register. Verify signature error. Record ${record.id}. ${error.message}. ${error.response?.body?.error}.`
            );
          }
        }
      }
      if (!validationIdentity) {
        for (const record of records) {
          if (record.signature) {
            throw new Error(
              `Internal Error. BPMN Register. Record ${record.id} has a signature. But key ${record.keyId} does not require a signature`
            );
          }
        }
      }
    }

    if (type === 'UPDATE' || type === 'CREATE') {
      const validationIdentity = global.config?.key_signature[keyId]?.validationIdentity;
      if (!signature && validationIdentity) {
        throw new Error(`Internal Error. BPMN Register. Key ${keyId} signature required.`);
      }
      if (signature && !validationIdentity) {
        throw new Error(`Internal Error. BPMN Register. Signature not allowed for key ${keyId}.`);
      }
      if (signature && validationIdentity) {
        let verifySignatureResponse;
        try {
          // PostgreSQL JSONB type has its own sort format. We need alphabetical sorting to correctly verify the signature.
          const sortedData = this.recursiveSort(recordData);

          const recordDataInBase64 = Buffer.from(JSON.stringify(sortedData)).toString('base64');
          verifySignatureResponse = await this.sign.verifySignatureExternal(recordDataInBase64, signature);
        } catch (error) {
          throw new Error(`Internal Error. BPMN Register. Verify signature error. ${error.message}. ${error.response?.body?.error}.`);
        }

        if (
          !validationIdentity.includes(verifySignatureResponse.data?.subjDRFOCode) &&
          !validationIdentity.includes(verifySignatureResponse.data?.subjEDRPOUCode)
        ) {
          throw new global.ErrorWithDetails('User do not have permission to sign record.', {
            signature,
            verifySignatureResponse,
            validationIdentity
          });
        }
      }
    }

    if (type === 'BLOCK') {
      const validationIdentity = global.config?.key_signature[keyId]?.validationIdentity;
      if (validationIdentity) {
        throw new Error(`Internal Error. BPMN Register. Update patch method doesnt allowed for this key ${keyId}. Key required sign.`);
      }
    }
  }

  private prepareRawSequelizeParams(rawFilterObject: any) {
    const operators = {
      eq: Sequelize.Op.eq,
      ne: Sequelize.Op.ne,
      lte: Sequelize.Op.lte,
      lt: Sequelize.Op.lt,
      gte: Sequelize.Op.gte,
      gt: Sequelize.Op.gt,
      like: Sequelize.Op.like,
      notLike: Sequelize.Op.notLike,
      in: Sequelize.Op.in,
      notIn: Sequelize.Op.notIn,
      or: Sequelize.Op.or,
      and: Sequelize.Op.and,
      any: Sequelize.Op.any,
      all: Sequelize.Op.all,
      contains: Sequelize.Op.contains
    };

    function replace(object) {
      if (global.typeOf(object) === 'array') {
        return object.map(replace);
      } else if (global.typeOf(object) === 'object') {
        return Object.fromEntries(Object.entries(object).map(([k, v]) => [k in operators ? operators[k] : k, replace(v)]));
      } else {
        return object;
      }
    }

    return replace(rawFilterObject);
  }

  // Check record data for potential XSS vulnerabilities
  private checkXss(recordData: any): boolean {
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);

    const allowedHTML = {
      ALLOWED_TAGS: [
        'b',
        'i',
        'em',
        'strong',
        'a',
        'div',
        'p',
        'span',
        'img',
        'pre',
        'code',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'table',
        'tbody',
        'td',
        'tr',
        'svg',
        'style',
        'br',
        'blockquote',
        'button',
        'sup',
        'th',
        'colgroup',
        'col',
        'mark',
        'details',
        'summary',
        'iframe',
        'header',
        'footer',
        'a'
      ],
      ALLOWED_ATTR: [
        'style',
        'class',
        'id',
        'width',
        'height',
        'colspan',
        'rowspan',
        'cellpadding',
        'cellspacing',
        'role',
        'aria-label',
        'tabIndex',
        'title',
        'href',
        'rel',
        'target'
      ]
    };

    const flattenRecordData = flattenjs.flatten(recordData);
    const errors = [];

    for (const key in flattenRecordData) {
      const value = flattenRecordData[key];
      if (typeOf(value) !== 'string') continue;
      const sanitizedValue = DOMPurify.sanitize(value, allowedHTML);
      if (value !== sanitizedValue) {
        errors.push({
          key,
          value
        });
      }
    }
    if (errors.length) {
      const error = new Error('Detected potential XSS.');
      (error as any).details = errors;
      throw error;
    }
    return true;
  }
}

interface RecordsGetAllFilter {
  allow_tokens?: string[];
  register_id?: number;
  key_id?: number;
  id?: number | { [Sequelize.Op.in]?: number[]; [Sequelize.Op.like]?: number[] };
  search_string?: string | { [op: symbol]: string | string[] };
  search_string_2?: string | { [op: symbol]: string | string[] };
  search_string_3?: string | { [op: symbol]: string | string[] };
  filters_type?: string;
  data?: any;
  meta?: any;
}

interface RecordsGetAllFilteredFilter {
  allow_tokens?: string[];
  register_id?: number;
  key_id?: number;
  id?: number | { [Sequelize.Op.in]?: number[]; [Sequelize.Op.like]?: number[] };
  search_string?: string | { [op: symbol]: string };
  search_string_2?: string | { [op: symbol]: string };
  search_string_3?: string | { [op: symbol]: string };
  filters_type?: string;
  data?: any;
  meta?: any;
  data_like?: any;
}
