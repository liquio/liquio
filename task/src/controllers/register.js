
const { matchedData } = require('express-validator');
const _ = require('lodash');

const Controller = require('./controller');
const RegisterService = require('../services/register');
const Sandbox = require('../lib/sandbox');
const { ERROR_DOCUMENT_TEMPLATE_NOT_FOUND, ERROR_DOCUMENT_NOT_FOUND } = require('../constants/error');
const { NotFoundError } = require('../lib/errors');
const typeOf = require('../lib/type_of');

// Constants.
const RECORDS_DEFAULT_LIMIT = 10;
const RECORDS_MAX_LIMIT = 5000;
const RECORDS_TREE_DEFAULT_LIMIT = 50000;
const RECORDS_TREE_MAX_LIMIT = 100000;
const HISTORY_DEFAULT_LIMIT = 10;
const HISTORY_MAX_LIMIT = 1000;

/**
 * Register controller.
 */
class RegisterController extends Controller {
  /**
   * Register controller constructor.
   */
  constructor() {
    // Define singleton.
    if (!RegisterController.singleton) {
      super();
      this.registerService = new RegisterService();
      this.sandbox = new Sandbox();
      RegisterController.singleton = this;
    }
    return RegisterController.singleton;
  }

  /**
   * Get registers.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRegisters(req, res) {
    let registers;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      registers = await businesses.register.getRegisters(userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, registers);
  }

  /**
   * Get keys.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getKeys(req, res) {
    let keys;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      keys = await businesses.register.getKeys(userUnitIds);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, keys);
  }

  /**
   * Get records by key ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRecordsByKeyId(req, res) {
    // Define params.
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    let {
      offset,
      limit = RECORDS_DEFAULT_LIMIT,
      strict,
      data,
      data_like: dataLike,
      data_nested,
      sort,
      search,
      search_2,
      search_3,
      search_equal,
      search_equal_2,
      search_equal_3,
      created_from,
      created_to,
      updated_from,
      updated_to,
      residentship_date_from,
      residentship_date_to,
      residentship_status_date_from,
      residentship_status_date_to,
      data_date_from,
      data_date_to
    } = matchedData(req, { locations: ['query'] });
    const userUnitIds = this.getRequestUserUnitIds(req);
    const accessInfo = this.getRequestAccessInfo(req);
    const allowTokens = this.getRequestUserUnitAllowTokens(req);

    // Append data dates filters.
    if (residentship_date_from) {
      data_date_from = { ...(data_date_from || {}), createdAt: residentship_date_from };
      residentship_date_from = undefined;
    }
    if (residentship_date_to) {
      data_date_to = { ...(data_date_to || {}), createdAt: residentship_date_to };
      residentship_date_to = undefined;
    }
    if (residentship_status_date_from) {
      data_date_from = { ...(data_date_from || {}), residentshipStatusDate: residentship_status_date_from };
      residentship_status_date_from = undefined;
    }
    if (residentship_status_date_to) {
      data_date_to = { ...(data_date_to || {}), residentshipStatusDate: residentship_status_date_to };
      residentship_status_date_to = undefined;
    }

    let records;
    try {
      records = await businesses.register.getRecordsByKeyId(keyId, userUnitIds, {
        offset,
        limit: Math.min(limit, RECORDS_MAX_LIMIT),
        key_id: keyId,
        data,
        data_like: dataLike,
        data_nested,
        sort,
        search,
        search_2,
        search_3,
        search_equal,
        search_equal_2,
        search_equal_3,
        created_from,
        created_to,
        updated_from,
        updated_to,
        residentship_date_from,
        residentship_date_to,
        residentship_status_date_from,
        residentship_status_date_to,
        data_date_from,
        data_date_to
        // is_search_string_array: true
        // is_search_string_array: (Array.isArray(search_equal) || Array.isArray(search_equal_2) || Array.isArray(search_equal_3)) ? true : undefined
      }, strict, allowTokens, accessInfo);

      const recordKey = await this.registerService.findKeyById(keyId);
      if (!recordKey) {
        log.save('register-key-not-found', { keyId }, 'error');
        throw new Error('Key not found.');
      }
      const { toString: keyToString } = recordKey;
      if (Array.isArray(records.data) && keyToString !== undefined && keyToString.startsWith('(')) {
        for (const record of records.data) {
          if (!record.data) {
            record.stringified = this.sandbox.evalWithArgs(
              keyToString,
              [{ data: record }],
              { meta: { fn: 'getRecordsByKeyId.keyToString', keyId, recordId: record.id } },
            );
          } else {
            record.stringified = this.sandbox.evalWithArgs(
              keyToString,
              [record],
              { meta: { fn: 'getRecordsByKeyId.keyToString', keyId, recordId: record.id } },
            );
          }
        }
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, records, true);
  }

  /**
   * Search.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async search(req, res) {
    // Define params.
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    const { text, limit = RECORDS_DEFAULT_LIMIT, offset } = matchedData(req, { locations: ['query'] });
    const normalizedText = text.replace(/%/g, '');
    const accessInfo = this.getRequestAccessInfo(req);

    // Check strict access.
    const hasStrictAccess = await businesses.register.checkStrictAccess(keyId);
    if (!hasStrictAccess) {
      return this.responseError(res, 'Searching allowed only for register keys with strict access.');
    }

    let records;
    try {
      records = await this.registerService.search(
        keyId,
        normalizedText,
        accessInfo,
        Math.min(limit, RECORDS_MAX_LIMIT),
        offset
      );
    } catch (error) {
      return this.responseError(res, error);
    }

    await businesses.register.prepareData();
    const keyInfo = businesses.register.keys.find(v => v.id === keyId);
    const { toString, schema: keySchema } = keyInfo;
    records.data = records.data.map(v => businesses.register.convertToStrictRecord(v, toString, keySchema));

    this.responseData(res, records, true);
  }

  /**
   * Get history by key ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getHistoryByKeyId(req, res) {
    // Define params.
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    const { offset, limit = HISTORY_DEFAULT_LIMIT, operation, record_data_like: recordDataLike } = matchedData(req, { locations: ['query'] });
    const userUnitIds = this.getRequestUserUnitIds(req);

    let history;
    try {
      history = await businesses.register.getHistoryByKeyId(keyId, userUnitIds, {
        offset,
        limit: Math.min(limit, HISTORY_MAX_LIMIT),
        record_data_like: recordDataLike,
        operation
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, history, true);
  }

  /**
   * Get viewing history by key ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getViewingHistoryByKeyId(req, res) {
    // Define params.
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    const { offset = 0, limit = HISTORY_DEFAULT_LIMIT, created_from, created_to } = matchedData(req, { locations: ['query'] });
    const userUnitIds = this.getRequestUserUnitIds(req);

    let viewingHistory;
    try {
      viewingHistory = await businesses.register.getViewingHistoryByKeyId(keyId, userUnitIds, {
        offset, limit: Math.min(limit, HISTORY_MAX_LIMIT),
        created_from, created_to
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, viewingHistory, true);
  }

  /**
   * Get history by record ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getHistoryByRecordId(req, res) {
    // Define params.
    const { key_id: keyId, record_id: recordId } = matchedData(req, { locations: ['params'] });
    const {
      offset,
      limit = HISTORY_DEFAULT_LIMIT,
      operation,
      split_by_fields: splitByFields = false,
      split_by_fields_order: splitByFieldsOrder = 'asc',
    } = matchedData(req, { locations: ['query'] });

    const userUnitIds = this.getRequestUserUnitIds(req);

    let history;
    try {
      history = await businesses.register.getHistoryByRecordId(keyId, recordId, userUnitIds, {
        offset,
        limit: Math.min(limit, HISTORY_MAX_LIMIT),
        operation,
        split_by_fields: splitByFields,
        split_by_fields_order: splitByFieldsOrder,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, history, true);
  }

  /**
   * Get viewing history by record ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getViewingHistoryByRecordId(req, res) {
    // Define params.
    const { key_id: keyId, record_id: recordId } = matchedData(req, { locations: ['params'] });
    const { offset = 0, limit = HISTORY_DEFAULT_LIMIT, created_from, created_to } = matchedData(req, { locations: ['query'] });

    const userUnitIds = this.getRequestUserUnitIds(req);

    let viewingHistory;
    try {
      viewingHistory = await businesses.register.getViewingHistoryByRecordId(keyId, recordId, userUnitIds, {
        offset, limit: Math.min(limit, HISTORY_MAX_LIMIT),
        created_from, created_to
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, viewingHistory, true);
  }

  /**
   * Get filtered records by key ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getFilteredRecordsByKeyId(req, res) {
    // Define params.
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    const userId = this.getRequestUserId(req);
    const {
      offset = 0,
      limit = RECORDS_DEFAULT_LIMIT,
      strict,
      data_like: dataLike,
      control,
      control_index: controlIndex,
      search
    } = matchedData(req, { locations: ['query'] });
    const userUnitIds = this.getRequestUserUnitIds(req);
    const accessInfo = this.getRequestAccessInfo(req);
    const allowTokens = this.getRequestUserUnitAllowTokens(req);

    // Check key is personal.
    try {
      await businesses.register.checkRequestToKey(keyId, { control });
    } catch (error) {
      log.save('check-request-to-key-error', { error: error && error.message });
      return this.responseError(res, error, 400);
    }

    // Get additional filters.
    let data = {};
    let sort = {};
    let body = {};
    let filters;
    let filtersType;
    let searchEqual;
    let searchEqual2;
    let searchEqual3;
    let searchLike;
    let searchLike2;
    let searchLike3;
    let isAutosave = false;
    let isMultiple = false;
    let stepName;
    let elementName;
    let documentId;
    let controlParts = [];
    if (control) controlParts = control.split('.'); // ['documents', '{document_id}', 'stepName', 'elementName']
    // Delete consecutive duplicates.
    controlParts = _.reject(controlParts, (array, i) => controlParts[i] === controlParts[i + 1]);
    const [controlPathCategory] = controlParts;
    const allowedControlPathCategories = ['documents'];
    if (control && !allowedControlPathCategories.includes(controlPathCategory)) {
      return this.responseError(res, 'Control path category is not allowed.', 400, { control, controlPathCategory });
    }
    if (controlParts.shift() === 'documents') {
      documentId = controlParts.shift();
      // Try to get document by id.
      let document;
      try {
        document = await businesses.document.findByIdAndCheckAccess(documentId, userId, userUnitIds);
      } catch (error) {
        return this.responseError(res, error);
      }
      if (!document) {
        return this.responseError(res, new NotFoundError(ERROR_DOCUMENT_NOT_FOUND));
      }
      // Get document_template JSON schema.
      const templateId = document.documentTemplateId;
      const template = await models.documentTemplate.findById(templateId);
      if (!template) return this.responseError(res, new NotFoundError(ERROR_DOCUMENT_TEMPLATE_NOT_FOUND));
      const jsonSchema = template.jsonSchema;

      // Get document step from path.
      stepName = controlParts.shift();
      const step = _.at(document, 'data.' + stepName)[0];
      const stepTemplate = _.at(jsonSchema, 'properties.' + stepName)[0];
      // if (!step) return this.responseError(res, 'Document doesn\'t have ' + stepName, 400 );
      if (!stepTemplate) return this.responseError(res, 'Document template doesn\'t have ' + stepName, 400);

      // Try to get iterator value.
      const iteratorValue = controlParts.find(v => parseInt(v) == v);

      // Get step element from path.
      elementName = businesses.register.getTemplatePathFromDataPath(controlParts.join('.'));
      const element = _.at(step, controlParts.join('.'))[0] || {};
      const elementTemplate = _.at(stepTemplate, elementName)[0];

      // Check if incorrect option control or keyId.
      if (!elementTemplate) return this.responseError(res, 'Document template doesn\'t have passed control.', 400, { control });
      const possibleRegisterControls = ['register', 'register.select', 'registry.search', 'schedule.calendar'];
      if (!possibleRegisterControls.includes(elementTemplate?.control)) {
        return this.responseError(res, 'Control is not register control.', 400, { control, elementTemplate, possibleRegisterControls });
      }
      if (`${elementTemplate.keyId}` !== `${keyId}`) {
        const keyIdFunction = this.sandbox.eval(elementTemplate.keyId);
        if (typeOf(keyIdFunction) !== 'function') {
          return this.responseError(res, 'Control has another keyId option.', 400, { control, elementTemplate, keyId });
        }
        if (!elementTemplate.whiteList || !Array.isArray(elementTemplate.whiteList) || elementTemplate.whiteList.length === 0) {
          return this.responseError(res, 'Must be defined "whiteList" option - an array of possible key ids.', 400, { control, elementTemplate, keyId });
        }
        const keyIdCalculated = keyIdFunction(document.data);
        if (!elementTemplate.whiteList.some(wlKeyId => `${wlKeyId}`.trim() === `${keyIdCalculated}`.trim() && `${keyIdCalculated}`.trim() === `${keyId}`)) {
          return this.responseError(res, 'Calculated keyId must be pressent in "whiteList" option.', 400, { control, elementTemplate, keyId, calculatedKeyId: keyIdCalculated, whiteList: elementTemplate.whiteList });
        }
      }

      // Define autosave params.
      if (elementTemplate) {
        const { setDefined, multiple } = elementTemplate;
        isAutosave = typeof setDefined === 'string' && setDefined.startsWith('(')
          ? this.sandbox.evalWithArgs(
            setDefined,
            [document.data],
            { meta: { fn: 'getFilteredRecordsByKeyId.setDefined', documentId, controlIndex } },
          )
          : !!setDefined;
        isMultiple = !!multiple;
      }

      // Add additional data to body if has additional filters.
      const additionalFilter = elementTemplate && elementTemplate.additionalFilter;
      if (additionalFilter) body = { // { additionalFilter, additionalFilterData: { element, step, document } }
        additionalFilter: elementTemplate.additionalFilter,
        additionalFilterData: {
          element, step, document
        }
      };

      // Format filters if exists.
      filters = elementTemplate && elementTemplate.filters || [];

      // check is filters defined
      // if (additionalFilter && (!filters || !filters.length)) {
      //   throw new Error('Filters must be defined if additionalFilter used');
      // }

      if (iteratorValue) {
        filters.forEach(v => {
          if (v.value) v.value = v.value.replace('.X.', `.${iteratorValue}.`);
        });
      }
      filtersType = elementTemplate && elementTemplate.filtersType;
      if (filtersType === 'or') {
        // OR filters.
        if (filters) for (const filterIndex in filters) {
          const filter = filters[filterIndex];
          data['_filters_type'] = filtersType;
          data[`${filter.name}|${filterIndex}`] = filter.value;
        }
      } else {
        // AND filters (default).
        if (filters) for (const filter of filters) {
          data[filter.name] = filter.value;
        }
      }

      // Format sorting if exists.
      const sortBy = elementTemplate && elementTemplate.sortBy;
      if (sortBy && typeof sortBy === 'object') for (const [sortKey, sortValue] of Object.entries(sortBy)) {
        sort[sortKey] = sortValue;
      }

      const { search, search2, search3 } = elementTemplate || {};
      if (search || search2 || search3) log.save('deprecated', { search, search2, search3 }, 'warning');

      // Defined search.
      const searchFunction = elementTemplate?.searchEqual || elementTemplate?.search;
      if (searchFunction) {
        try {
          searchEqual = this.sandbox.evalWithArgs(
            searchFunction,
            [document.data, controlIndex],
            { meta: { fn: 'getFilteredRecordsByKeyId.searchEqual', keyId } },
          );
        } catch {
          this.responseError(res, 'Search equal definition error.'); 
        }
      }

      const searchFunction2 = elementTemplate?.searchEqual2 || elementTemplate?.search2;
      if (searchFunction2) {
        try {
          searchEqual2 = this.sandbox.evalWithArgs(
            searchFunction2,
            [document.data, controlIndex],
            { meta: { fn: 'getFilteredRecordsByKeyId.searchEqual2', keyId } },
          );
        } catch {
          this.responseError(res, 'Search equal 2 definition error.'); 
        }
      }

      const searchFunction3 = elementTemplate?.searchEqual3 || elementTemplate?.search3;
      if (searchFunction3) {
        try {
          searchEqual3 = this.sandbox.evalWithArgs(
            searchFunction3,
            [document.data, controlIndex],
            { meta: { fn: 'getFilteredRecordsByKeyId.searchEqual3', keyId } },
          );
        } catch {
          this.responseError(res, 'Search equal 3 definition error.'); 
        }
      }

      // Defined search like.
      const searchLikeFunction = elementTemplate && elementTemplate.searchLike;
      if (searchLikeFunction) {
        try {
          searchLike = this.sandbox.evalWithArgs(
            searchLikeFunction,
            [document.data, controlIndex],
            { meta: { fn: 'getFilteredRecordsByKeyId.searchLikeFunction', keyId } },
          );
        } catch {
          this.responseError(res, 'Search like definition error.'); 
        }
      }

      const searchLikeFunction2 = elementTemplate && elementTemplate.searchLike2;
      if (searchLikeFunction2) {
        try {
          searchLike2 = this.sandbox.evalWithArgs(
            searchLikeFunction2,
            [document.data, controlIndex],
            { meta: { fn: 'getFilteredRecordsByKeyId.searchLikeFunction2', keyId } },
          );
        } catch {
          this.responseError(res, 'Search like 2 definition error.'); 
        }
      }

      const searchLikeFunction3 = elementTemplate && elementTemplate.searchLike3;
      if (searchLikeFunction3) {
        try {
          searchLike3 = this.sandbox.evalWithArgs(
            searchLikeFunction3,
            [document.data, controlIndex],
            { meta: { fn: 'getFilteredRecordsByKeyId.searchLikeFunction3', keyId } },
          );
        } catch {
          this.responseError(res, 'Search like 3 definition error.'); 
        }
      }

      // Change dot notation filter data values to its natural values.
      for (const filterDataIndex in data) {
        let tmpDataValue;
        let tmpTemplateValue;

        // Check if array.
        try {
          tmpDataValue = this.sandbox.eval(data[filterDataIndex]);
          if (Array.isArray(tmpDataValue)) {
            data[filterDataIndex] = tmpDataValue;
            continue;
          }
        } catch {
          // Do nothing.
        }

        // Check if in object.
        try {
          tmpTemplateValue = _.at(jsonSchema, businesses.register.getTemplatePathFromDataPath(data[filterDataIndex]));
          tmpDataValue = _.at(document, data[filterDataIndex]);
          if (tmpTemplateValue[0] || (typeof data[filterDataIndex] === 'string' && data[filterDataIndex].startsWith('data.')) || tmpDataValue[0] === false) {
            if (tmpDataValue[0] || tmpDataValue[0] === false) {
              data[filterDataIndex] = tmpDataValue[0];
            } else {
              delete data[filterDataIndex];
            }
          }
        } catch {
          // Do nothing.
        }
      }
    }

    // Get records.
    let records;
    try {
      records = await businesses.register.getFilteredRecordsByKeyId(keyId, userUnitIds, {
        offset,
        limit: Math.min(limit, RECORDS_MAX_LIMIT),
        key_id: keyId,
        data: (searchEqual || searchEqual2 || searchEqual3 || searchLike || searchLike2 || searchLike3) ? undefined : data,
        data_like: dataLike,
        sort,
        search: searchLike ? searchLike : search,
        search_2: searchLike2,
        search_3: searchLike3,
        search_equal: searchEqual,
        search_equal_2: searchEqual2,
        search_equal_3: searchEqual3,
      }, strict, allowTokens, body, accessInfo, control);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Save to document if need it.
    let updatedData;

    //If filters defined in document schema, but neither value of them didn't calculate - will not update document (issue 4921).
    const isDefinedFiltersEmpty = (filters?.length > 0 && _.isEmpty(data));

    if (isAutosave && !isDefinedFiltersEmpty) {
      // Update document.
      try {
        const recordKey = await this.registerService.findKeyById(keyId);
        if (!recordKey) {
          log.save('register-key-not-found', { keyId }, 'error');
          throw new Error('Key not found.');
        }
        const { schema: keySchema, toString: keyToString } = recordKey;
        // const pathToSave = `${stepName}.${elementName}`.replace(/.properties.|.items./g, '.');
        const pathToSave = `${stepName}.${controlParts.join('.')}`;
        // controlParts
        let valuesToSave = [];
        const registerParams = {
          offset,
          limit: Math.min(limit, RECORDS_MAX_LIMIT),
          key_id: keyId,
          data: (searchEqual || searchEqual2 || searchEqual3 || searchLike || searchLike2 || searchLike3) ? undefined : data,
          data_like: dataLike,
          sort,
          search: searchLike ? searchLike : search,
          search_2: searchLike2,
          search_3: searchLike3,
          search_equal: searchEqual,
          search_equal_2: searchEqual2,
          search_equal_3: searchEqual3,
          allow_tokens: allowTokens,
        };
        const records = await this.registerService.getFilteredRecords(registerParams, body, accessInfo);
        if (Array.isArray(records.data)) {
          valuesToSave = records.data.map(v => {
            const normalizedRecord = {
              registerId: v.registerId, keyId: v.keyId, id: v.id, value: v.id
            };
            const recordEntries = Object.entries(v.data);
            for (const recordEntry of recordEntries) {
              const [entryKey, entryValue] = recordEntry;
              if (keySchema.properties && keySchema.properties[entryKey] && keySchema.properties[entryKey].public) {
                const normalizedEntryKey = entryKey === 'id' ? '_id' : entryKey;
                normalizedRecord[normalizedEntryKey] = entryValue;
              }
            }
            try {
              normalizedRecord.stringified = this.sandbox.evalWithArgs(
                keyToString,
                [v],
                { meta: { fn: 'getFilteredRecordsByKeyId.keyToString', keyId, recordId: v.id } },
              );
              normalizedRecord.label = normalizedRecord.stringified;
            } catch {
              log.save('can-not-define-stringified-text', { record: v }, 'warn');
            }
            return normalizedRecord;
          });
        }
        const valueToSave = isMultiple ? valuesToSave : valuesToSave[0];
        await businesses.document.update(documentId, [{
          path: pathToSave,
          value: valueToSave
        }], userId, userUnitIds);
        updatedData = {
          path: pathToSave,
          value: valueToSave
        };
      } catch (error) {
        return this.responseError(res, error);
      }
    }

    this.responseData(res, { ...records, meta: { ...records.meta, updated: updatedData } }, true);
  }

  /**
   * Get records tree by keys IDs.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRecordsTreeByKeyIds(req, res) {
    // Define params.
    const matchedParams = matchedData(req, { locations: ['params'] });
    const keyIds = matchedParams.key_ids.split(',').map(v => parseInt(v));
    const {
      offset = 0,
      limit = RECORDS_TREE_DEFAULT_LIMIT,
      excludeList
    } = matchedData(req, { locations: ['query'] });
    const accessInfo = this.getRequestAccessInfo(req);

    let records;
    try {
      records = await businesses.register.getRecordsTreeByKeyIds(keyIds, {
        offset,
        limit: Math.min(limit, RECORDS_TREE_MAX_LIMIT)
      }, accessInfo, excludeList);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, records);
  }

  /**
   * Find record by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findRecordById(req, res) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const accessInfo = this.getRequestAccessInfo(req);

    let record;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      record = await businesses.register.findRecordById(id, userUnitIds, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createRecord(req, res) {
    // Get userInfo.
    const userInfo = this.getRequestUserInfo(req);
    const userName = userInfo && userInfo.name;
    const userId = userInfo && userInfo.userId;
    const person = { id: userId, name: userName };
    const accessInfo = this.getRequestAccessInfo(req);

    const body = matchedData(req, { locations: ['body'] });
    let record;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      record = await businesses.register.createRecord(userUnitIds, { ...body, person }, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateRecordById(req, res) {
    // Get userInfo.
    const userInfo = this.getRequestUserInfo(req);
    const userName = userInfo && userInfo.name;
    const userId = userInfo && userInfo.userId;
    const person = { id: userId, name: userName };
    const accessInfo = this.getRequestAccessInfo(req);

    const { id } = matchedData(req, { locations: ['params'] });
    const body = matchedData(req, { locations: ['body'] });
    let record;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      record = await businesses.register.updateRecordById(id, userUnitIds, { ...body, person }, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteRecordById(req, res) {
    // Get userInfo.
    const userInfo = this.getRequestUserInfo(req);
    const userName = userInfo && userInfo.name;
    const userId = userInfo && userInfo.userId;
    const person = { id: userId, name: userName };
    const accessInfo = this.getRequestAccessInfo(req);

    const { id } = matchedData(req, { locations: ['params'] });
    let record;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      record = await businesses.register.deleteRecordById(id, userUnitIds, person, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Get addresses.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAddresses(req, res) {
    // Define params.
    const keys = config.register.registerKeysForAddresses || [];

    let addresses;
    try {
      addresses = await businesses.register.getRecordsTreeByKeyIds(keys);
    } catch (err) {
      return this.responseError(res, err);
    }

    this.responseData(res, addresses);
  }

  /**
   * Delete register cache.
   * @param {e.request} req
   * @param {e.response} res
   * @return {Promise<number>}
   */
  async deleteCache(req, res) {
    let deletedKeys;
    try {
      deletedKeys = await this.registerService.deleteCache();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, { deletedKeys });
  }

  /**
   * Start rollback.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async startRollback(req, res) {
    // Get userInfo.
    const userInfo = this.getRequestUserInfo(req);
    const userName = userInfo?.name;
    const userId = userInfo?.userId;
    const person = { id: userId, name: userName };
    const accessInfo = this.getRequestAccessInfo(req);

    const { keyId, timePoint } = matchedData(req, { locations: ['body'] });
    let rollbackId;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      const startRollbackResponse = await businesses.register.startRollback({ keyId, timePoint }, userUnitIds, { person, accessInfo });
      rollbackId = startRollbackResponse.rollbackId;
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, { rollbackId });
  }

  /**
   * Get rollback status.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRollbackStatusWithDetails(req, res) {
    const { rollbackId } = matchedData(req, { locations: ['params'] });

    let rollbackStatus;
    try {
      rollbackStatus = await businesses.register.getRollbackStatusWithDetails(rollbackId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, rollbackStatus);
  }

  /**
   * Rollback one record.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async rollbackRecord(req, res) {
    // Get userInfo.
    const userInfo = this.getRequestUserInfo(req);
    const userName = userInfo?.name;
    const userId = userInfo?.userId;
    const person = { id: userId, name: userName };
    const accessInfo = this.getRequestAccessInfo(req);

    const { historyId, recordId, keyId } = matchedData(req, { locations: ['body'] });

    let rollbackedRecordResponse;
    try {
      const userUnitIds = this.getRequestUserUnitIds(req);
      rollbackedRecordResponse = await businesses.register.rollbackRecord({ historyId, recordId, keyId }, userUnitIds, { person, accessInfo });
    } catch (error) {
      return this.responseError(res, error);
    }
    const { rollbackedRecord } = rollbackedRecordResponse;

    this.responseData(res, { rollbackedRecord });
  }
}

module.exports = RegisterController;
