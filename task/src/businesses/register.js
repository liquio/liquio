
const _ = require('lodash');

const Business = require('./business');
const UnitAccessModel = require('../models/unit_access');
const UnitAccessEntity = require('../entities/unit_access');
const RegisterService = require('../services/register');
const { JSONPath } = require('../lib/jsonpath');
const RedisClient = require('../lib/redis_client');
const Sandbox = require('../lib/sandbox');
const { InvalidParamsError, ForbiddenError, NotFoundError } = require('../lib/errors');

// Constants.
const ALLOW_CREATE = 'create';
const ALLOW_READ = 'read';
const ALLOW_UPDATE = 'update';
const ALLOW_DELETE = 'delete';
const ALLOW_HISTORY = 'history';
const HIDE_KEY = 'hide_key';
const ALLOW_HEAD = 'head';
const WRONG_ACCESS_METHOD = 'Wrong access method.';

const ERROR_REGISTER_RECORD_ACCESS = 'User doesn\'t have any access to register record.';
const ERROR_REGISTER_RECORD_STRICT_ACCESS = 'Strict access to register record not allowed.';
const ERROR_KEY_RECORDS_READONLY = 'Key records are readonly.';

/**
 * Register business.
 */
class RegisterBusiness extends Business {
  /**
   * Register business constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!RegisterBusiness.singleton) {
      super(config);
      this.unitAccessModel = new UnitAccessModel();
      this.registerService = new RegisterService();
      this.sandbox = new Sandbox();
      this.registers = [];
      this.keys = [];
      this.unitAccess = [];
      RegisterBusiness.singleton = this;
    }
    return RegisterBusiness.singleton;
  }

  /**
   * Access method.
   */
  get AccessMethod() {
    return {
      ALLOW_CREATE,
      ALLOW_READ,
      ALLOW_UPDATE,
      ALLOW_DELETE,
      ALLOW_HISTORY,
      ALLOW_HEAD,
      HIDE_KEY
    };
  }

  get AccessMethodToConfigMapper() {
    return {
      [ALLOW_CREATE]: 'allowCreate',
      [ALLOW_READ]: 'allowRead',
      [ALLOW_UPDATE]: 'allowUpdate',
      [ALLOW_DELETE]: 'allowDelete',
      [ALLOW_HISTORY]: 'allowHistory',
      [HIDE_KEY]: 'hideKey'
    };
  }

  /**
   * Get registers.
   * @param {number[]} userUnitIds User unit IDs.
   * @returns {Promise<object[]>}
   */
  async getRegisters(userUnitIds) {
    await this.prepareData();

    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_READ);

    return this.registers.filter((register) => {
      const keysForRegister = this.keysByRegister[register.id] || [];
      return keysForRegister.some(key =>
        this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, key.id)
      );
    });
  }

  /**
   * Get keys.
   * @param {number[]} userUnitIds User unit IDs.
   * @returns {Promise<object[]>}
   */
  async getKeys(userUnitIds) {
    await this.prepareData();

    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_READ);

    const keys = this.keys.filter((key) =>
      this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, key.id)
    );
    return this.mapKeysWithAccess(userUnitIds, _.cloneDeep(keys));
  }

  async mapKeysWithAccess(userUnitIds, keys) {
    const defaultAccess = {
      allowRead: true,
      hideKey: false,
      allowCreate: false,
      allowUpdate: false,
      allowDelete: false,
      allowHistory: false,
    };

    const updateAccessForMethod = async (key, method, accessField) => {
      const { userUnitsAccess, accessConfigMethod } = await this.getAccessConfig(userUnitIds, method);
      key.access[accessField] = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, key.id);
    };
    const updateAccessForHideKey = async (key, method, accessField) => {
      const { userUnitsAccess } = await this.getAccessConfig(userUnitIds, method);
      key.access[accessField] = this.shouldBeHidden(userUnitIds, userUnitsAccess, key.id);
    };

    return Promise.all(
      keys.map(async (key) => {
        key.access = { ...defaultAccess };

        await updateAccessForHideKey(key, this.AccessMethod.HIDE_KEY, 'hideKey');
        await updateAccessForMethod(key, this.AccessMethod.ALLOW_CREATE, 'allowCreate');
        await updateAccessForMethod(key, this.AccessMethod.ALLOW_UPDATE, 'allowUpdate');
        await updateAccessForMethod(key, this.AccessMethod.ALLOW_DELETE, 'allowDelete');
        await updateAccessForMethod(key, this.AccessMethod.ALLOW_HISTORY, 'allowHistory');

        return key;
      })
    );
  }

  /**
   * Get records by key ID.
   * @param {number} keyId Key ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} params Params.
   * @param {boolean} strict Is strict indicator.
   * @param {string[]} allowTokens Allow tokens.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getRecordsByKeyId(keyId, userUnitIds, params, strict = false, allowTokens, accessInfo) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_READ, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    if (!strict && !hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Check strict access (to record ID and stringified text).
    if (strict && !(await this.checkStrictAccess(keyId))) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_STRICT_ACCESS);
    }

    // Access to records.
    if (await this.checkAccessSeeAllRecords(userUnitIds)) {
      params = { ...params, allow_see_all_records: true };
    } else {
      params = { ...params, allow_tokens: allowTokens, disable_fields_rules: true };
    }

    // Get records.
    let records = await this.registerService.getRecords(params, accessInfo);

    // Define and return record ID and stringified text for strict access.
    if (strict) {
      await this.prepareData();
      const keyInfo = this.keys.find(v => v.id === keyId);
      const { toString, schema: keySchema } = keyInfo;

      // Handle key schema controls.
      records.data = await this.handleControlsGet(records, keySchema);

      records.data = records.data.map(v => this.convertToStrictRecord(v, toString, keySchema));
    }

    // Return records info.
    return records;
  }

  /**
   * Get history by key ID.
   * @param {number} keyId Key ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} params Params.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getHistoryByKeyId(keyId, userUnitIds, params) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_HISTORY, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Get history.
    const history = await this.registerService.getHistoryByKeyId(keyId, params);

    // Return history info.
    return history;
  }

  /**
   * Get viewing history by key ID.
   * @param {number} keyId Key ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {{offset, limit, created_from, created_to}} params Params.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getViewingHistoryByKeyId(keyId, userUnitIds, params) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_HISTORY, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Get and return viewing history.
    return this.registerService.getViewingHistoryByKeyId(keyId, params);
  }

  /**
   * Get history by key ID.
   * @param {number} keyId Key ID.
   * @param {number} recordId Record ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} params Params.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getHistoryByRecordId(keyId, recordId, userUnitIds, params) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_HISTORY, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Get history.
    const history = await this.registerService.getHistoryByRecordId(recordId, params);
    if (history && Array.isArray(history.data) && history.data.some(v => v.keyId !== keyId)) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Return history info.
    return history;
  }

  /**
     * Get viewing history by key ID.
     * @param {number} keyId Key ID.
     * @param {number} recordId Record ID.
     * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
     * @param {{offset, limit, created_from, created_to}} params Params.
     * @returns {Promise<object[]>} Records list promise.
     */
  async getViewingHistoryByRecordId(keyId, recordId, userUnitIds, params) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_HISTORY, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Get viewing history.
    const viewingHistory = await this.registerService.getViewingHistoryByRecordId(recordId, params);
    if (viewingHistory && Array.isArray(viewingHistory.data) && viewingHistory.data.some(v => v.keyId !== keyId)) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Return viewing history info.
    return viewingHistory;
  }

  /**
   * Get records by key ID (full access).
   * @param {number} keyId Key ID.
   * @param {object} params Params.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getRecordsByKeyIdFullAccess(keyId, params = {}) {
    // Get records.
    if (!params.key_id) params.key_id = keyId;
    let records = await this.registerService.getRecords({
      ...params,
      allow_see_all_records: true,
    });

    // Return records info.
    return records;
  }

  /**
   * Get filtered records by key ID.
   * @param {number} keyId Key ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} params Params.
   * @param {boolean} strict Is strict indicator.
   * @param {string[]} allowTokens Allow tokens.
   * @param {object} body Request body.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @param {object} control Control.
   * @returns {Promise<Object[]>} Records list promise.
   */
  async getFilteredRecordsByKeyId(
    keyId,
    userUnitIds,
    params,
    strict = false,
    allowTokens,
    body = {},
    accessInfo,
    control
  ) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_READ, false);

    // Check access to key.
    const hasReadAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    const hasStrictAccess = await this.checkStrictAccess(keyId);
    const hasAccessFromJsonSchemaControl = !!control;
    if (!hasReadAccess && !hasStrictAccess && !hasAccessFromJsonSchemaControl) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Access to records.
    if (await this.checkAccessSeeAllRecords(userUnitIds)) {
      params = { ...params, allow_see_all_records: true };
    } else {
      params = { ...params, allow_tokens: allowTokens, disable_fields_rules: true };
    }

    // Get records.
    let records = await this.registerService.getFilteredRecords(params, body, accessInfo);

    // Define and return record ID and stringified text for strict access.
    if (strict) {
      await this.prepareData();
      const keyInfo = this.keys.find(v => v.id === keyId);
      const { toString, schema: keySchema } = keyInfo;
      if (records.data) records.data = records.data.map(v => this.convertToStrictRecord(v, toString, keySchema));
    }

    // Return records info.
    return records;
  }

  /**
   * Get records tree by key ID.
   * @param {number} keyId Key ID.
   * @param {object} [params] Params.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getRecordsTreeByKeyId(keyId, params = { offset: 0, limit: 100000 }, accessInfo) {
    // Check strict access (to record ID and stringified text).
    if (!(await this.checkStrictAccess(keyId))) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_STRICT_ACCESS);
    }

    // Get records.
    let records = await this.registerService.getRecords({ ...params, key_id: keyId }, accessInfo);

    // Define and return record ID and stringified text.
    await this.prepareData();
    const keyInfo = this.keys.find(v => v.id === keyId);
    const { toString, schema, parentId: keyParentId } = keyInfo;
    records.data = records.data.map((v) =>
      this.convertToStrictRecord(v, toString, schema, keyParentId),
    );

    // Return records info.
    return records;
  }

  /**
   * Get records tree by key IDs.
   * @param {number[]} keyIds Key IDs list.
   * @param {object} [params] Params.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @param {Object} excludeList.
   * @returns {Promise<object[]>} Records list promise.
   */
  async getRecordsTreeByKeyIds(
    keyIds,
    params = { offset: 0, limit: 100000 },
    accessInfo,
    excludeList,
  ) {
    // Define .
    const linkedKeyIds = await this.getLinkedKeyIds(keyIds);

    // Records container.
    let records = [];

    let parsedExcludeList;
    if (excludeList) {
      parsedExcludeList = JSON.parse(excludeList);
    }

    // Add records by all keys.
    for (const keyId of linkedKeyIds) {
      if (parsedExcludeList) {
        params.exclude = parsedExcludeList[keyId];
      }
      const recordsPart = await this.getRecordsTreeByKeyId(keyId, params, accessInfo);
      records.push(...(recordsPart.data || []));
    }

    // Return records info.
    return records;
  }

  /**
   * Get linked key IDs list.
   * @param {number[]} initKeyIds Init key IDs.
   */
  async getLinkedKeyIds(initKeyIds) {
    // Load init keys.
    await this.prepareData();
    const initKeys = this.keys.filter(v => initKeyIds.includes(v.id));

    // Define linked keys container and fill with needed keys.
    let linkedKeys = [...initKeys];

    // Append all other linked keys between needed init keys.
    for (const initKey of initKeys) {
      // Prepare params.
      const linkedKeyIds = linkedKeys.map((v) => v.id);
      const linkedKeyPerentIds = linkedKeys.map((v) => v.parentId);

      // Check init key linked by parent ID with already existing linked key.
      if (linkedKeyIds.includes(initKey.parentId)) {
        continue;
      }

      // Check one of linked keys linked by parent ID with init key.
      if (linkedKeyPerentIds.includes(initKey.id)) {
        continue;
      }

      // Try to build links chain from init key to linked keys.
      let linksChain = [];
      let chainFound = false;
      while (!chainFound) {
        if (linksChain.length === 0) {
          linksChain.push(initKey);
        }
        const lastKey = linksChain[linksChain.length - 1];
        const nextKey = this.keys.find((v) => v.id === lastKey.parentId);
        if (!nextKey) {
          break;
        }
        linksChain.push(nextKey);
        if (!nextKey.parentId) {
          break;
        }
        if (linkedKeyIds.includes(nextKey.parentId)) {
          chainFound = true;
          break;
        }
      }
      if (chainFound) {
        linkedKeys = [...new Set([...linkedKeys, ...linksChain])];
      }
    }

    // Return defined links chain.
    return linkedKeys.map(v => v.id);
  }

  /**
   * Find record and check access.
   * @param {string} recordId Record ID.
   * @param {string} keyId Key ID.
   * @param {string[]} allowTokens Allow tokens.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async findRecordAndCheckAccess(recordId, keyId, allowTokens, userUnitIds, accessInfo = {}) {
    if (!allowTokens) {
      throw new InvalidParamsError('Missing required parameters: allowTokens');
    }

    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_READ, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    const params = {
      record_id: recordId,
      key_id: keyId,
      allow_tokens: allowTokens
    };
    const response = await this.registerService.getRecords(params, accessInfo);
    const record = response?.data?.[0];

    if (!record) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    return record;
  }


  /**
   * Find record by ID.
   * @param {string} id Record ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async findRecordById(id, userUnitIds, accessInfo) {
    const record = await this.registerService.findRecordById(id, accessInfo);

    if (!record) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_READ, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, record.keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    return record;
  }

  /**
   * Create record.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} data Data.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createRecord(userUnitIds, data, accessInfo) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_CREATE, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, data.keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Handle key schema controls.
    const handledData = await this.handleControlsCreate(data);

    return await this.registerService.createRecord(handledData, accessInfo);
  }

  /**
   * Update record by ID.
   * @param {string} id Record ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} data Data.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async updateRecordById(id, userUnitIds, data, accessInfo) {
    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_UPDATE, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, data.keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    // Handle key schema controls.
    const handledData = await this.handleControlsUpdate(id, data);

    if (this.checkKeyContainsAllowTokensOptionFields(data.keyId)) {
      throw new ForbiddenError('Key contains fields with allowTokens option.');
    }

    return await this.registerService.updateRecordById(id, handledData, accessInfo);
  }

  /**
   * Delete record by ID.
   * @param {string} id Record ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} person Person.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteRecordById(id, userUnitIds, person, accessInfo) {
    const record = await this.registerService.findRecordById(id);

    if (!record) {
      throw new NotFoundError('Register record not found.');
    }

    const {
      userUnitsAccess,
      accessConfigMethod
    } = await this.getAccessConfig(userUnitIds, this.AccessMethod.ALLOW_DELETE, false);

    const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, record.keyId);
    if (!hasAccess) {
      throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
    }

    return await this.registerService.deleteRecordById(id, person, accessInfo);
  }

  /**
   * Check request to key.
   * @param {number} keyId Key ID.
   * @param {{control}} options Request options.
   */
  async checkRequestToKey(keyId, options) {
    // Define options.
    const { control } = options;

    // Get key.
    const key = await this.getKeyById(keyId);

    // Check control option defined if key is personal.
    const isKeyPersonal = this.isKeyPersonal(key);
    if (isKeyPersonal && !control) {
      throw new Error('Option "control" should be defined for personal register keys.');
    }
  }

  /**
   * Is key personal.
   * @param {object} key Key.
   * @returns {boolean} Is key personal indicator.
   */
  isKeyPersonal(key) {
    return !!(key && key.meta && key.meta.isPersonal);
  }

  /**
   * Get key by ID.
   * @param {string} number Key ID.
   * @returns {Promise<{id, schema, meta}>} Key promise.
   */
  async getKeyById(keyId) {
    await this.prepareData();
    const key = this.keys.find(v => v.id === keyId);
    return key;
  }

  /**
   * Prepare data with cache.
   * @private
   */
  async prepareData() {
    const [registers, keys, unitAccess] = await Promise.all([
      this.registerService.getRegisters({ limit: config.register.limit }),
      this.registerService.getKeys({ limit: config.register.limit }),
      this.unitAccessModel.getAllWithCache(),
    ]);

    if (registers && registers.data) {
      this.registers = registers.data;
    }

    if (keys && keys.data) {
      this.keys = keys.data;
      this.keysByRegister = keys.data.reduce((map, key) => {
        map[key.registerId] = map[key.registerId] || [];
        map[key.registerId].push(key);
        return map;
      }, {});
    }

    if (unitAccess) {
      this.unitAccess = unitAccess;
    }
  }

  /**
   * Check if has access.
   * @private
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} userUnitsAccess
   * @param {string} accessConfigMethod Access method name.
   * @param {number} keyId Key ID.
   * @returns {boolean}
   */
  hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId) {
    const unitsThatHaveAccessToKey = userUnitsAccess.filter((unit) =>
      unit.keys[accessConfigMethod]?.includes(keyId)
    );

    if (!unitsThatHaveAccessToKey.length) {
      // User do not have needed access.
      return false;
    }

    if (unitsThatHaveAccessToKey.every(unit => unit.keys.allowHead?.includes(keyId))) {
      // If every user unit that has needed access to key additionally required allowHead access to this key - we need to check that user is a head in one of them.
      return unitsThatHaveAccessToKey.some(unit => userUnitIds.head.includes(unit.unit));
    }

    return true;
  }

  /**
   * Check if should be hidden
   * If it is present - it returns true
   * Powers `hideKey` logic
   * @private
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} userUnitsAccess
   * @param {number} keyId Key ID.
   * @returns {boolean}
   */
  shouldBeHidden(userUnitIds, userUnitsAccess, keyId) {
    const unitsWithReadAccess = userUnitsAccess.filter((unit) =>
      unit.keys[this.AccessMethodToConfigMapper[this.AccessMethod.ALLOW_READ]]?.includes(keyId)
    );

    if (!unitsWithReadAccess.length) {
      return true;
    }

    const unitsThatHideTheKey = unitsWithReadAccess.filter((unit) =>
      unit.keys[this.AccessMethodToConfigMapper[this.AccessMethod.HIDE_KEY]]?.includes(keyId)
    );
    const unitsThatExposeTheKey = unitsWithReadAccess.filter((unit) =>
      !unit.keys[this.AccessMethodToConfigMapper[this.AccessMethod.HIDE_KEY]]?.includes(keyId)
    );

    if (unitsThatHideTheKey.length < unitsWithReadAccess.length) {
      if (unitsThatExposeTheKey.every(unit => unit.keys.allowHead?.includes(keyId))) {
        // If every user unit that has needed access to key additionally required allowHead access to this key - we need to check that user is a head in one of them.
        return !unitsThatExposeTheKey.some(unit => userUnitIds.head.includes(unit.unit));
      }
      return false;
    } else {
      return true;
    }
  }

  /**
   * Return config for checking access.
   * @private
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {string} accessMethod Access method name.
   * @param {boolean} [usePreparedCache] Use cache indicator.
   * @returns {Promise<object>}
   */
  async getAccessConfig(userUnitIds, accessMethod, usePreparedCache = true) {
    const userUnitsAccess = await this.getRegisterAccessConfig(userUnitIds.all, usePreparedCache);

    const accessConfigMethod = this.AccessMethodToConfigMapper[accessMethod];
    if (!accessConfigMethod) {
      throw new Error(WRONG_ACCESS_METHOD);
    }

    return {
      userUnitsAccess,
      accessConfigMethod
    };
  }

  /**
   * Check strict access.
   * @private
   * @param {number} keyId Key ID.
   * @returns {Promise<boolean>} Access allowed indicator.
   */
  async checkStrictAccess(keyId) {
    const { data: isAllowed } = await RedisClient.getOrSet(
      RedisClient.createKey('register', 'checkStrictAccess', keyId),
      async () => {
        // Check config.
        const strictAccessKeys = await this.getRegisterStrictAccessKeysConfig();

        // Check if allowed and return.
        const isAllowed = strictAccessKeys.includes(keyId);

        if (isAllowed) {
          const key = await this.getKeyById(keyId);

          // Check if key is personal.
          if (this.isKeyPersonal(key)) {
            return new Error('Personal register keys are not allowed to use in strict access mode.');
          }
        }

        return isAllowed;
      },
    );

    if (isAllowed instanceof Error) {
      throw isAllowed;
    }

    return isAllowed;
  }

  /**
   * Check access see all records.
   * @private
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @returns {Promise<boolean>}
   * @returns {Promise<boolean>}
   */
  async checkAccessSeeAllRecords(userUnitIds) {
    const access = await this.getRegisterAccessConfig(userUnitIds.all, false);
    if (access.some(item => item.allowSeeAllRecords === true)) {
      return true;
    }

    return false;
  }

  /**
   * Convert to strict record.
   * @param {object} record Record.
   * @param {string} toString Stringified function to get string from registry record.
   * @param {string} [keySchema] Key schema.
   * @param {number} [parentKeyId] Key parent ID.
   * @returns {{id, registerId, keyId, stringified}} Strict record.
   */
  convertToStrictRecord(record, toString = '() => undefined;', keySchema, parentKeyId) {
    // Parse record.
    const { id, registerId, keyId, createdAt, updatedAt } = record;

    // Define stringified text.
    let stringified;
    try {
      stringified = this.sandbox.evalWithArgs(
        toString,
        [record],
        { meta: { fn: 'convertToStrictRecord', recordId: record.id } },
      );
    } catch (error) {
      log.save('convert-to-strict-record-error', { error: error && error.message, record, keySchema }, 'warn');
    }

    // Define strict record.
    let strictRecord = { id, registerId, keyId, recordCreatedAt: createdAt, recordUpdatedAt: updatedAt, stringified };

    // Append relations accordance to key schema info.
    if (keySchema) {
      const { properties: keyProperties = {} } = keySchema;
      for (const keyProperty in keyProperties) {
        const keyPropertyValue = keyProperties[keyProperty];
        if (keyPropertyValue.isRelationId) {
          strictRecord.isRelationId = record.data[keyProperty];
        }
        if (keyPropertyValue.isRelationLink) {
          strictRecord.isRelationLink = record.data[keyProperty];
        }
        if (keyPropertyValue.public) {
          const normalizedKeyProperty = keyProperty === 'id' ? '_id' : keyProperty;
          strictRecord[normalizedKeyProperty] = record.data[keyProperty];
        }
      }
    }

    // Append key parent ID.
    if (parentKeyId) {
      strictRecord.parentKeyId = parentKeyId;
    }

    // Return strict record.
    return strictRecord;
  }

  /**
   * @param {number} keyId
   * @param {string} searchByName
   * @param {Array} searchByArray
   * @param {Object} options
   * @param {Object} data - filter data
   * @return {Promise<Object[]>}
   * @param sort
   */
  async getInterRegistryFullAccessRecords(keyId, searchByName, searchByArray = [], options = {}, data = {}, sort = {}) {
    // Define params.
    const { offset, limit } = { offset: 0, limit: 20, ...options };
    let params = { offset, limit, key_id: keyId, data, sort };
    params.data[searchByName] = JSON.stringify(searchByArray);
    params.allow_see_all_records = true;

    // Get data.
    let recordsResponse = await this.getRecordsByKeyIdFullAccess(keyId, params);

    return recordsResponse;
  }

  /**
   * Generate template path from data path.
   * Always starts by 'properties' or 'items'.
   * Examples:
   * - for nested array: "element1.43.element3" => "properties.element1.items.properties.element3"
   * - started from array: "43.element3" => "items.properties.element3"
   * - for started with `data`: "data.element1.element2" => "properties.element1.properties.element2"
   * @param path
   * @return {string} in dot notation.
   */
  getTemplatePathFromDataPath(path) {
    let part = '';
    let templateParts = [];
    let pathParts = path.split('.');
    if (pathParts.length) part = pathParts.shift();
    if (pathParts.length && part === 'data') part = pathParts.shift();
    while (part) {
      if (part == parseInt(part)) {
        templateParts.push('items');
      } else {
        templateParts.push('properties');
        templateParts.push(part);
      }
      part = pathParts.length ? pathParts.shift() : false;
    }

    return templateParts.join('.');
  }

  /**
   * Get register access config.
   * @param {number[]} unitIds Unit IDs list.
   * @param {boolean} [usePreparedCache] Use cache indicator.
   * @returns {Promise<{unitId, allowSeeAllRecords, keys: {allowRead, allowCreate, allowUpdate, allowDelete, allowHistory, allowHead}}[]>} Access list promise.
   */
  async getRegisterAccessConfig(unitIds, usePreparedCache = true) {
    // Get from DB with cache.
    const unitAccess = usePreparedCache
      ? this.unitAccess
      : await this.unitAccessModel.getAllWithCache();
    const accessToRegisterForSpecificUnitsList = unitAccess.filter(
      (v) =>
        unitIds.includes(v.unitId) &&
        v.type === UnitAccessEntity.Types.register,
    );
    const accessFromDb = accessToRegisterForSpecificUnitsList.map((v) => ({
      ...v.data,
      unit: v.unitId,
    }));

    // Get from config.
    const accessFromConfig = config.register.access.filter((v) =>
      unitIds.includes(v.unit),
    );

    // Merge and return.
    const access = unitIds
      .filter(
        (v) =>
          accessFromDb.some((d) => d.unit === v) ||
          accessFromConfig.some((c) => c.unit === v),
      )
      .map((v) => {
        const accessFromDbRecord = JSON.parse(
          JSON.stringify(accessFromDb.find((d) => d.unit === v) || {}),
        );
        const accessFromConfigRecord = JSON.parse(
          JSON.stringify(accessFromConfig.find((c) => c.unit === v) || {}),
        );
        let accessRecord = { ...accessFromConfigRecord, ...accessFromDbRecord };
        const allowRead = [...new Set([..._.get(accessFromDbRecord, 'keys.allowRead', []), ..._.get(accessFromConfigRecord, 'keys.allowRead', [])])];
        const allowCreate = [...new Set([..._.get(accessFromDbRecord, 'keys.allowCreate', []), ..._.get(accessFromConfigRecord, 'keys.allowCreate', [])])];
        const allowUpdate = [...new Set([..._.get(accessFromDbRecord, 'keys.allowUpdate', []), ..._.get(accessFromConfigRecord, 'keys.allowUpdate', [])])];
        const allowDelete = [...new Set([..._.get(accessFromDbRecord, 'keys.allowDelete', []), ..._.get(accessFromConfigRecord, 'keys.allowDelete', [])])];
        const allowHistory = [...new Set([..._.get(accessFromDbRecord, 'keys.allowHistory', []), ..._.get(accessFromConfigRecord, 'keys.allowHistory', [])])];
        const allowHead = [...new Set([..._.get(accessFromDbRecord, 'keys.allowHead', []), ..._.get(accessFromConfigRecord, 'keys.allowHead', [])])];
        const hideKey = [...new Set([..._.get(accessFromDbRecord, 'keys.hideKey', []), ..._.get(accessFromConfigRecord, 'keys.hideKey', [])])];
        _.set(accessRecord, 'keys.allowRead', allowRead);
        _.set(accessRecord, 'keys.allowCreate', allowCreate);
        _.set(accessRecord, 'keys.allowUpdate', allowUpdate);
        _.set(accessRecord, 'keys.allowDelete', allowDelete);
        _.set(accessRecord, 'keys.allowHistory', allowHistory);
        _.set(accessRecord, 'keys.allowHead', allowHead);
        _.set(accessRecord, 'keys.hideKey', hideKey);
        // const accessRecord = _.mergeWith(accessFromConfigRecord, accessFromDbRecord, (objValue, srcValue) => {
        //   if (_.isArray(objValue)) { return objValue.concat(srcValue); }
        // });
        return accessRecord;
      });

    return access;
  }

  /**
   * Get register strict access keys config.
   * @returns {Promise<number[]>} Strict access keys promise.
   */
  async getRegisterStrictAccessKeysConfig() {
    // Get from DB with cache.
    const unitAccess = await this.unitAccessModel.getAllWithCache();
    const accessToRegisterForAllUnits = unitAccess
      .find(v => !v.unitId && v.type === UnitAccessEntity.Types.register);
    const { data: { strictAccess: { keys: strictAccessKeysFromDb = [] } = {} } = {} } = accessToRegisterForAllUnits || {};

    // Get from config.
    const { strictAccess: { keys: strictAccessKeysFromConfig = [] } = {} } = config.register;

    // Merge and return.
    const strictAccessKeys = [...new Set([...strictAccessKeysFromDb, ...strictAccessKeysFromConfig])];
    return strictAccessKeys;
  }

  /**
   * Handle key schema controls for get operation.
   * @param {{data: RegisterRecord[], meta: {count: number, offset: number, limit: number}}} recordList
   * @param {Object} keySchema
   * @return {Promise<{data: RegisterRecord[]}>}
   */
  async handleControlsGet(recordList, keySchema) {
    if (!recordList.data.length) {
      return recordList.data;
    }

    // Get key properties.
    const { properties: keyProperties = {} } = keySchema;

    // Handle controls.
    for (const keyProperty in keyProperties) {
      const { control } = keyProperties[keyProperty];

      if (control === 'registerLink') {
        // Get linked records info.
        const { isFull, linkTo, linkKeyId } = keyProperties[keyProperty];

        // Dynamic add public property to key schema.
        keyProperties[keyProperty + 'Linked'] = {
          type: isFull ? 'object' : 'string',
          public: true
        };

        // Get linked index list.
        const linkIndexList = [];
        for (const record of recordList.data) {
          linkIndexList.push(record.data[keyProperty]);
        }

        // Skip if linked index list not found.
        if (!linkIndexList.length) {
          continue;
        }

        // Get linked record list key info.
        await this.prepareData();
        const linkedKeyInfo = this.keys.find(v => v.id === linkKeyId);

        // Get needed indexed column.
        // Define that toSearchSting function returning single element or array.
        const regex = /\[([a-z .,'`]+)\]/gim;
        const regexResult = regex.exec(linkedKeyInfo.toSearchString);

        // Define default linkIndex as first column.
        let linkIndex = 1;
        if (regexResult !== null) {
          // If toSearchSting function return array, find needed column by linkTo.
          const columnList = regexResult[1].split(',');
          for (const column of columnList) {
            if (column.indexOf(`data.${linkTo}`) !== -1) {
              break;
            }
            linkIndex++;
          }
        }

        // Get record list to link from register.
        const params = {
          register_id: linkedKeyInfo.registerId,
          key_id: linkKeyId,
          is_search_string_array: true,
          search: (!linkIndex || linkIndex === 1) ? linkIndexList : undefined,
          search_2: (linkIndex === 2) ? linkIndexList : undefined,
          search_3: (linkIndex === 3) ? linkIndexList : undefined
        };
        const recordListToLink = await this.registerService.getRecords(params);

        function linkRecords(a, b) {
          const aS = a.sort((a, b) => a.data[keyProperty] - b.data[keyProperty]);
          const bS = b.sort((a, b) => a.data[linkTo] - b.data[linkTo]);
          const aLength = aS.length;
          const bLength = bS.length;
          let aI = 0;
          let bI = 0;

          while (aI < aLength) {
            if (bI >= bLength) {
              break;
            }
            if (aS[aI].data[keyProperty] === bS[bI].data[linkTo]) {
              if (isFull) {
                aS[aI].data[keyProperty + 'Linked'] = bS[bI].data;
              } else {
                aS[aI].data[keyProperty + 'Linked'] = this.sandbox.evalWithArgs(
                  linkedKeyInfo.toString,
                  [bS[bI]],
                  { meta: { fn: 'recordListToLink.link', context: bS[bI] } },
                );
              }
              aI++;
              if (aS[aI] && aS[aI].data[keyProperty] === bS[bI].data[linkTo]) {
                continue;
              }
              bI++;
            } else if (aS[aI].data[keyProperty] > bS[bI].data[linkTo]) {
              bI++;
            } else {
              aI++;
            }
          }
          return aS;
        }

        recordList.data = linkRecords(recordList.data, recordListToLink.data);
      }
    }

    return recordList.data;
  }

  /**
   * Handle key schema controls for update operation.
   * @param {RegisterRecord} record
   * @return {Promise<{data: RegisterRecord[]}>}
   */
  async handleControlsUpdate(id, record) {
    // Get key schema properties.
    await this.prepareData();
    const {
      schema: {
        properties: keyProperties = {}
      } = {}
    } = this.keys.find(v => v.id === record.keyId);

    // Retrieve the previous record state if there are readOnly properties
    let oldRecord;
    if (Object.values(keyProperties).some(v => v.readOnly)) {
      oldRecord = await this.registerService.findRecordById(id);
    }

    // Handle controls.
    for (const keyProperty in keyProperties) {
      const { control, readOnly } = keyProperties[keyProperty];

      // Replace the value with the old value if the property is readOnly
      if (readOnly) {
        record.data[keyProperty] = oldRecord.data[keyProperty];
      }

      if (control === 'registerLink') {
        // Get linked record info.
        const { linkTo, linkKeyId } = keyProperties[keyProperty];

        // Get linked index.
        const linkedIndex = record.data[keyProperty];

        // Skip if linked index not found.
        if (!linkedIndex) {
          continue;
        }

        // Get linked record list key info.
        await this.prepareData();
        const linkedKeyInfo = this.keys.find(v => v.id === linkKeyId);

        // Get needed indexed column.
        // Define that toSearchSting function returning single element or array.
        const regex = /\[([a-z .,'`]+)\]/gim;
        const regexResult = regex.exec(linkedKeyInfo.toSearchString);

        // Define default linkIndex as first column.
        let linkIndex = 1;
        if (regexResult !== null) {
          // If toSearchSting function return array, find needed column by linkTo.
          const columnList = regexResult[1].split(',');
          for (const column of columnList) {
            if (column.indexOf(`data.${linkTo}`) !== -1) {
              break;
            }
            linkIndex++;
          }
        }

        // Get linked record.
        const params = {
          register_id: linkedKeyInfo.registerId,
          key_id: linkKeyId,
          search: (!linkIndex || linkIndex === 1) ? linkedIndex : undefined,
          search_2: (linkIndex === 2) ? linkedIndex : undefined,
          search_3: (linkIndex === 3) ? linkedIndex : undefined
        };
        const linkedRecord = await this.registerService.getRecords(params);

        if (!linkedRecord.data || !linkedRecord.data.length) {
          log.save('register-businesses|handle-control-update|record-to-link-not-found', { record, control: keyProperties[keyProperty], params }, 'error');
          throw new Error(`Trying update linked record, but record to link not found. Record to link: ${JSON.stringify(params)}`);
        }
      }
    }

    return record;
  }

  /**
   * Handle key schema controls for create operation.
   * @param {RegisterRecord} record
   * @return {Promise<{data: RegisterRecord[]}>}
   */
  async handleControlsCreate(record) {
    // Get key schema properties.
    await this.prepareData();
    const {
      schema: {
        properties: keyProperties = {}
      } = {}
    } = this.keys.find(v => v.id === record.keyId);

    // Handle controls.
    for (const keyProperty in keyProperties) {
      const { control } = keyProperties[keyProperty];

      if (control === 'registerLink') {
        // Get linked record info.
        const { linkTo, linkKeyId } = keyProperties[keyProperty];

        // Get linked index.
        const linkedIndex = record.data[keyProperty];

        // Skip if linked index not found.
        if (!linkedIndex) {
          continue;
        }

        // Get linked record list key info.
        await this.prepareData();
        const linkedKeyInfo = this.keys.find(v => v.id === linkKeyId);

        // Get needed indexed column.
        // Define that toSearchSting function returning single element or array.
        const regex = /\[([a-z .,'`]+)\]/gim;
        const regexResult = regex.exec(linkedKeyInfo.toSearchString);

        // Define default linkIndex as first column.
        let linkIndex = 1;
        if (regexResult !== null) {
          // If toSearchSting function return array, find needed column by linkTo.
          const columnList = regexResult[1].split(',');
          for (const column of columnList) {
            if (column.indexOf(`data.${linkTo}`) !== -1) {
              break;
            }
            linkIndex++;
          }
        }

        // Get linked record.
        const params = {
          register_id: linkedKeyInfo.registerId,
          key_id: linkKeyId,
          search: (!linkIndex || linkIndex === 1) ? linkedIndex : undefined,
          search_2: (linkIndex === 2) ? linkedIndex : undefined,
          search_3: (linkIndex === 3) ? linkedIndex : undefined
        };
        const linkedRecord = await this.registerService.getRecords(params);

        if (!linkedRecord.data || !linkedRecord.data.length) {
          log.save('register-businesses|handle-control-create|record-to-link-not-found', { record, control: keyProperties[keyProperty], params }, 'error');
          throw new Error(`Trying create linked record, but record to link not found. Record to link: ${JSON.stringify(params)}`);
        }
      }
    }

    return record;
  }

  /**
   * Check key schema contains fields with allowTokens option.
   * @param {keyId} keyId
   * @return {boolean}
   */
  checkKeyContainsAllowTokensOptionFields(keyId) {
    this.prepareData();
    const { schema: { properties } } = this.keys.find(k => k.id === keyId);
    const propsWithAllowTokens = JSONPath('$..allowTokens', properties);
    return propsWithAllowTokens.some(el => Array.isArray(el) && el.length > 0);
  }

  /**
   * Start rollback.
   * @param {object} rollbackOption.
   * @param {integer} rollbackOption.keyId Key ID.
   * @param {string} rollbackOption.timePoint Time point.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} accessOption.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessOption.accessInfo Access info.
   * @returns {Promise<object>}
   */
  async startRollback({ keyId, timePoint }, userUnitIds, { accessInfo }) {
    // Check user has full access to key.
    for (const methodKey in this.AccessMethod) {
      if (this.AccessMethod[methodKey] === ALLOW_HEAD || this.AccessMethod[methodKey] === HIDE_KEY) {
        // We should skip ALLOW_HEAD method because it is additional to every other one. It is checking automatically.
        // We also skip HIDE_KEY method because it should not impact the rollback
        continue;
      }

      const {
        userUnitsAccess,
        accessConfigMethod
      } = await this.getAccessConfig(userUnitIds, this.AccessMethod[methodKey], false);

      const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
      if (!hasAccess) {
        throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
      }
    }
    if (await this.checkKeyIsReadonly(keyId)) {
      throw new ForbiddenError(ERROR_KEY_RECORDS_READONLY);
    }
    return await this.registerService.startRollback({ keyId, timePoint }, { accessInfo });
  }

  /**
   * Get rollback status with details.
   * @param {object} rollbackId. Rollback ID.
   * @returns {Promise<object>}
   */
  async getRollbackStatusWithDetails(rollbackId) {
    return await this.registerService.getRollbackStatusWithDetails(rollbackId);
  }

  /**
   * Rollback one record.
   * @param {object} rollbackRecordOptions.
   * @param {string} rollbackRecordOptions.historyId History ID.
   * @param {string} rollbackRecordOptions.recordId Record ID.
   * @param {integer} rollbackRecordOptions.keyId Key ID.
   * @param {{all: Array<number>, head: Array<number>, member: Array<number>}} userUnitIds User unit IDs.
   * @param {object} accessOption.
   * @param {{systemId, userId, userName, orgName, position, remarks}} accessOption.accessInfo Access info.
   * @returns {Promise<object>}
   */
  async rollbackRecord({ historyId, recordId, keyId }, userUnitIds, { accessInfo }) {
    // Check user has full access to key.
    for (const methodKey in this.AccessMethod) {
      if (this.AccessMethod[methodKey] === ALLOW_HEAD || this.AccessMethod[methodKey] === HIDE_KEY) {
        // We should skip ALLOW_HEAD method because it is additional to every other one. It is checking automatically.
        // We also skip HIDE_KEY method because it should not impact the rollback
        continue;
      }

      const {
        userUnitsAccess,
        accessConfigMethod
      } = await this.getAccessConfig(userUnitIds, this.AccessMethod[methodKey], false);

      const hasAccess = this.hasAccess(userUnitIds, userUnitsAccess, accessConfigMethod, keyId);
      if (!hasAccess) {
        throw new ForbiddenError(ERROR_REGISTER_RECORD_ACCESS);
      }
    }
    if (await this.checkKeyIsReadonly(keyId)) {
      throw new ForbiddenError(ERROR_KEY_RECORDS_READONLY);
    }

    return await this.registerService.rollbackRecord({ historyId, recordId, keyId }, { accessInfo });
  }

  /**
   * Check key is locked.
   * @param {object} keyId Key ID.
   * @returns {boolean} Is key lock indicator.
   */
  async checkKeyIsReadonly(keyId) {
    const accessMode = await this.getKeyAccessMode(keyId);
    return accessMode === 'read_only';
  }

  /**
   * Get access mode by key ID.
   * @param {*} keyId Key ID.
   * @returns {string} Access mode ("full", "read_only", "write_only").
   */
  async getKeyAccessMode(keyId) {
    const key = await this.getKeyById(keyId);
    return key.accessMode;
  }
}

module.exports = RegisterBusiness;
