import crypto from 'crypto';
import Sequelize from 'sequelize';
import Ajv from 'ajv';

import Business from './business';
import RegisterModel from '../models/register';
import KeyModel from '../models/key';
import RecordModel from '../models/record';
import { RedisClient } from '../lib/redis_client';

// Constants.
const AUTO_CLEAR_INTERVAL = 1000 * 60 * 60 * 24; // 1 day.
const IMPORT_IN_ONE_TIME_COUNT = 100;
const STATUSES = {
  Importing: 'Importing',
  Imported: 'Imported',
  Failed: 'Failed'
};

/**
 * Import business.
 */
export default class ImportBusiness extends Business {
  static singleton: ImportBusiness;

  registerModel: RegisterModel;
  keyModel: KeyModel;
  recordModel: RecordModel;
  toImport: { [key: string]: any };

  /**
   * ImportBusiness constructor.
   * @param {object} config Config object.
   * @return {ImportBusiness}
   */
  constructor(config: object) {
    // Define singleton.
    if (!ImportBusiness.singleton) {
      super(config);
      this.registerModel = RegisterModel.getInstance();
      this.keyModel = KeyModel.getInstance();
      this.recordModel = RecordModel.getInstance();
      this.toImport = {}; // { importId: { status, details: { recordsCount, importedRegisterSchema, importedKeySchema, importedRecords, insertedRecordsCount, updatedRecordsCount, removedOldRecords, removedOldRecordsCount, error } } }
      ImportBusiness.singleton = this;
    }
    return ImportBusiness.singleton;
  }

  /**
   * Import statuses.
   * @return {STATUSES} Import statuses.
   * @example
   * const statuses = ImportBusiness.Statuses;
   */
  static get Statuses() {
    return STATUSES;
  }

  /**
   * Get key and register by key ID.
   * @param {number} keyId Key ID.
   * @return {{key, register}} Key and register.
   * @throws {Error} Error.
   * @example
   * const { key, register } = await importBusiness.getKeyAndRegister(1);
   */
  async getKeyAndRegister(keyId) {
    // Get key.
    const keyModelResponse = await this.keyModel.findById(keyId);
    const { data: key } = keyModelResponse || {};
    if (!key) throw new Error('Key not found');

    // Get register.
    const { registerId } = key || {};
    const registerModelResponse = await this.registerModel.findById(registerId);
    const { data: register } = registerModelResponse || {};
    if (!register) throw new Error('Register not found');

    // Return key and register.
    return { key, register };
  }

  /**
   * Generate import ID.
   * @return {string} Import ID.
   * @example
   * const importId = importBusiness.generateImportId();
   */
  generateImportId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate.
   * @private
   * @param {object} data Data to import.
   * @param {object} data.key Key to import.
   * @param {object} data.register Register to import.
   * @param {object[]} data.records Records to import.
   * @param {object} [data.options] Options.
   * @param {boolean} [data.options.onlySchema] Remove old records.
   * @throws {Error} Error.
   * @example
   * importBusiness.validate({
   *   key: { ... },
   *   register: { ... },
   *   records: [ { ... }, { ... } ]
   * });
   */
  async validate({ key, register, records, options = {} }) {
    // Define params.
    const onlySchema = options['onlySchema'];

    // Check schema.
    if (!register) throw new Error('Register is required');
    if (!key) throw new Error('Key is required');
    if (key.registerId !== register.id) throw new Error('Key and register are not related');
    if (onlySchema) return;

    // Check records.
    if (!records) throw new Error('Records is required');
    if (!Array.isArray(records)) throw new Error('Records must be an array');
    if (records.some((v) => !v.id)) throw new Error('Record ID is required for all records');
    if (records.some((v) => v.registerId !== register.id)) throw new Error('Record and register are not related');
    if (records.some((v) => v.keyId !== key.id)) throw new Error('Record and key are not related');
  }

  /**
   * Start import.
   * @param {string} importId Import ID.
   * @param {object} data Data to import.
   * @param {object} data.key Key to import.
   * @param {object} data.register Register to import.
   * @param {object[]} data.records Records to import.
   * @param {object} [data.options] Options.
   * @param {boolean} [data.options.onlySchema] Remove old records.
   * @param {boolean} [removeOldRecords=false] Remove old records.
   * @param {string} [user='system'] User.
   * @param {{userId, userName}} [accessInfo] Access info.
   * @return {Promise<string>} Import ID promise.
   * @example
   * const importId = await importBusiness.startImport('importId', {
   *   key: { ... },
   *   register: { ... },
   *   records: [ { ... }, { ... } ]
   * }, true);
   */
  async startImport(
    { key, register, records, options = {} },
    removeOldRecords = false,
    user = 'system',
    accessInfo = { userId: null, userName: null }
  ) {
    await this.validate({ key, register, records, options });
    const importId = this.generateImportId();
    this.import(importId, { key, register, records, options }, removeOldRecords, user, accessInfo);
    setTimeout(() => this.clearToImport(importId), AUTO_CLEAR_INTERVAL);
    return importId;
  }

  /**
   * Import.
   * @private
   * @param {string} importId Import ID.
   * @param {object} data Data to import.
   * @param {object} data.key Key to import.
   * @param {object} data.register Register to import.
   * @param {object[]} data.records Records to import.
   * @param {object} [data.options] Options.
   * @param {boolean} [data.options.onlySchema] Remove old records.
   * @param {boolean} [removeOldRecords=false] Remove old records.
   * @param {string} [user='system'] User.
   * @param {{userId, userName}} [accessInfo] Access info.
   * @throws {Error} Error.
   * @example
   * importBusiness.import('importId', {
   *   key: { ... },
   *   register: { ... },
   *   records: [ { ... }, { ... } ]
   * }, true);
   */
  async import(
    importId,
    { key, register, records, options = {} },
    removeOldRecords = false,
    user = 'system',
    accessInfo = { userId: null, userName: null }
  ) {
    // Define params.
    const onlySchema = options['onlySchema'] ?? false;

    // Create "to import" record.
    await this.createToImportRecord(importId, records?.length);

    // Try to handle.
    try {
      // Import schema.
      await this.importRegisterSchema(importId, register, user);
      await this.importKeySchema(importId, key, user, register.id);

      // Return if only schema.
      if (onlySchema) {
        this.toImport[importId].status = ImportBusiness.Statuses.Imported;
        await this.updateToImportState(importId);
        return;
      }

      // Import records.
      await this.importRecords(importId, records, user, accessInfo);

      // Remove old records if need it.
      await this.removeOldRecordsIfNeedIt(importId, { key, register, records }, removeOldRecords, user, accessInfo);
    } catch (error) {
      // Set error status.
      this.toImport[importId].status = ImportBusiness.Statuses.Failed;
      this.toImport[importId].details.error = error?.message;
      await this.updateToImportState(importId);
      throw error;
    }

    // Set status.
    this.toImport[importId].status = ImportBusiness.Statuses.Imported;
    await this.updateToImportState(importId);
  }

  /**
   * Import register schema.
   * @private
   * @param {string} importId Import ID.
   * @param {object} register Register to import.
   * @param {string} [user] User.
   * @throws {Error} Error.
   * @example
   * await importBusiness.importRegisterSchema('importId', { ... });
   */
  async importRegisterSchema(importId, register, user) {
    const { data: existingRegister } = (await this.registerModel.findById(register.id)) || {};
    if (existingRegister) {
      await this.registerModel.update(register.id, register);
    } else {
      await this.registerModel.create({ ...register, user });
    }
    this.toImport[importId].details.importedRegisterSchema = true;
    await this.updateToImportState(importId);
  }

  /**
   * Import key schema.
   * @private
   * @param {string} importId Import ID.
   * @param {object} key Key to import.
   * @param {string} user User.
   * @param {number} registerId Register ID.
   * @throws {Error} Error.
   * @example
   * await importBusiness.importKeySchema('importId', { ... });
   */
  async importKeySchema(importId, key, user, registerId) {
    const { data: existingKey } = (await this.keyModel.findById(key.id)) || {};
    if (existingKey) {
      if (existingKey.registerId !== registerId) {
        throw new Error('Key already exist and not related to the same register.');
      }

      if (key.isEncrypted === undefined) {
        // Fallback to unencrypted key for backwards compatibility.
        key.isEncrypted = false;
      }

      if (existingKey.isEncrypted !== key.isEncrypted) {
        throw new Error("Can't modify encryption state for an existing key.");
      }

      await this.checkExistingRecordsByJsonSchema(key.id, key.schema);
      await this.keyModel.update(key.id, key);
    } else {
      await this.keyModel.create({ ...key, user });
    }
    this.toImport[importId].details.importedKeySchema = true;
    await this.updateToImportState(importId);
  }

  /**
   * Import records.
   * @private
   * @param {string} importId Import ID.
   * @param {object[]} records Records to import.
   * @param {string} [user='system'] User.
   * @param {{userId, userName}} [accessInfo] Access info.
   * @example
   * importBusiness.importRecords('importId', [ { ... }, { ... } ]);
   */
  async importRecords(importId, records, user = 'system', accessInfo = { userId: null, userName: null }) {
    let currentOffset = 0;
    while (currentOffset < records.length) {
      const currentPromises = [];
      const recordsToImport = records.slice(currentOffset, currentOffset + IMPORT_IN_ONE_TIME_COUNT);
      for (const record of recordsToImport) {
        currentPromises.push(this.importRecord(importId, record, user, accessInfo));
      }
      await Promise.all(currentPromises);
      currentOffset += IMPORT_IN_ONE_TIME_COUNT;
    }
    this.toImport[importId].details.importedRecords = true;
    await this.updateToImportState(importId);
  }

  /**
   * Import record.
   * @private
   * @param {string} importId Import ID.
   * @param {object} record Record to import.
   * @param {string} [user='system'] User.
   * @param {{userId, userName}} [accessInfo] Access info.
   * @throws {Error} Error.
   * @example
   * importBusiness.importRecord('importId', { ... }, 'user');
   */
  async importRecord(importId, record, user = 'system', accessInfo = { userId: null, userName: null }) {
    let existingRecord;
    try {
      const existingRecordModelResponse = await this.recordModel.findById(record.id);
      existingRecord = existingRecordModelResponse.data;
    } catch {
      existingRecord = null;
    }
    const historyMeta = { accessInfo };
    const person = { id: accessInfo?.userId, name: accessInfo?.userName };
    if (existingRecord) {
      await this.recordModel.update(record.id, { ...record, user, person }, true, historyMeta);
      this.toImport[importId].details.updatedRecordsCount++;
      await this.updateToImportState(importId);
    } else {
      await this.recordModel.create({ ...record, user, person }, true, historyMeta);
      this.toImport[importId].details.insertedRecordsCount++;
      await this.updateToImportState(importId);
    }
  }

  /**
   * Remove old records if need it.
   * @private
   * @param {string} importId Import ID
   * @param {object} data Data to import.
   * @param {object} data.key Key to import.
   * @param {object} data.register Register to import.
   * @param {object[]} data.records Records to import.
   * @param {boolean} [removeOldRecords=false] Remove old records.
   * @param {string} [user='system'] User.
   * @param {{userId, userName}} [accessInfo] Access info.
   * @example
   * importBusiness.removeOldRecordsIfNeedIt({
   *   key: { ... },
   *   register: { ... },
   *   records: [ { ... }, { ... } ]
   * }, true);
   */
  async removeOldRecordsIfNeedIt(
    importId,
    { key, register, records },
    removeOldRecords = false,
    user = 'system',
    accessInfo = { userId: null, userName: null }
  ) {
    // Remove old records if need it.
    if (removeOldRecords) {
      const removeCounterCb = (removedRecordsCount) => {
        this.toImport[importId].details.removedOldRecordsCount = removedRecordsCount;
      };
      const historyMeta = { accessInfo };
      const person = { id: accessInfo?.userId, name: accessInfo?.userName };
      const { removedRecords } = await this.recordModel.bulkDelete(
        {
          register_id: register.id,
          key_id: key.id,
          id: { [Sequelize.Op.notIn]: records.map((record) => record.id) }
        },
        undefined,
        removeCounterCb,
        user,
        person,
        historyMeta
      );
      this.toImport[importId].details.removedOldRecordsCount = removedRecords;
      this.toImport[importId].details.removedOldRecords = true;
      await this.updateToImportState(importId);
    }
  }

  /**
   * Check "to import" status with details.
   * @param {string} importId Import ID.
   * @return {string} Status.
   * @example
   * const status = importBusiness.checkToImportStatusWithDetails('importId');
   */
  async checkToImportStatusWithDetails(importId) {
    let status;
    let details;

    if (this.toImport[importId]) {
      ({ status, details } = this.toImport[importId]);
    } else if (global.config?.redis?.isEnabled) {
      try {
        const serializedData = await RedisClient.getInstance().get(['register', 'importId', importId]);
        ({ status, details } = JSON.parse(serializedData));
      } catch (error) {
        this.log.save('get-import-status-error', { importId, error: error?.message, stack: error?.stack });
        throw new Error('Can not get import status.');
      }
    } else {
      throw new Error('Can not get import status.');
    }

    const importProgressPercent =
      typeof details.recordsCount === 'undefined'
        ? 100
        : parseFloat((((details.insertedRecordsCount + details.updatedRecordsCount) / details.recordsCount) * 100).toFixed(2));
    return { status, details: { ...details, importProgressPercent } };
  }

  /**
   * Create "to import" record.
   * @private
   * @param {string} importId Import ID.
   * @param {number} recordsCount Records count.
   * @return {object} "To import" record.
   * @example
   * importBusiness.createToImportRecord('importId');
   */
  async createToImportRecord(importId, recordsCount) {
    this.toImport[importId] = {
      status: STATUSES.Importing,
      details: {
        recordsCount,
        importedRegisterSchema: false,
        importedKeySchema: false,
        importedRecords: false,
        insertedRecordsCount: 0,
        updatedRecordsCount: 0,
        removedOldRecords: false,
        removedOldRecordsCount: 0,
        error: null
      }
    };

    await this.updateToImportState(importId);

    return this.toImport[importId];
  }

  /**
   * Check existing records by JSON schema.
   * @private
   * @param {string} keyId Key ID.
   * @param {object} jsonSchema JSON schema.
   * @throws {Error} Error.
   * @example
   * importBusiness.checkExistingRecordsByJsonSchema(12345, { ... });
   * @see https://github.com/ajv-validator/ajv
   */
  async checkExistingRecordsByJsonSchema(keyId, jsonSchema) {
    // Create JSON schema validator.
    const ajv = new Ajv();
    const validation = ajv.compile(jsonSchema);

    // Check existing records by JSON schema.
    const { data: existingRecords } = await this.recordModel.getByKeyId(keyId);
    for (let i = 0; i < existingRecords.length; i++) {
      const existingRecord = existingRecords[i];
      const { id, data } = existingRecord;
      validation(data);
      const validationErrors = validation.errors || [];
      if (validationErrors.length > 0) {
        throw new Error(`Record with ID "${id}" doesn't match JSON schema. Validation errors: ${JSON.stringify(validationErrors)}`);
      }
    }
  }

  /**
   * Clear "to import".
   * @private
   * @param {string} [importId] Import ID.
   * @example
   * importBusiness.clearToImport('importId');
   * @example
   * importBusiness.clearToImport();
   */
  clearToImport(importId) {
    if (importId) {
      this.toImport[importId] = undefined;
    } else {
      this.toImport = {};
    }
    if (global.gc) global.gc();
  }

  async updateToImportState(importId) {
    if (!this.toImport[importId]) return;

    const serializedData = JSON.stringify(this.toImport[importId]);

    if (global.config?.redis?.isEnabled) {
      await RedisClient.getInstance().set(['register', 'importId', importId], serializedData, AUTO_CLEAR_INTERVAL / 1000);
    }
  }
}
