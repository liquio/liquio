import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Stream from '../lib/stream';
import Controller from './controller';
import RegisterModel from '../models/register';
import KeyModel from '../models/key';
import RecordModel from '../models/record';
import RegisterBusiness from '../businesses/register';
import Isolation from '../lib/isolation';

// Constants.
const DB_ERROR_KEYS_EXIST = 'violates foreign key constraint "keys_register_id_fkey" on table "keys"';

/**
 * Registers controller.
 */
export default class RegistersController extends Controller {
  static singleton: RegistersController;

  registerModel: RegisterModel;
  keyModel: KeyModel;
  recordModel: RecordModel;
  registerBusiness: RegisterBusiness;
  exportImportRegisterUuid: 'export_#@ec1bc454b33d11ecb909-0242ac120002&^%_import';
  exportImportRecordUuid: 'export_*&#$5782b2c7-4f234df9&!+*&?_import-';

  /**
   * Registers controller constructor.
   * @param {object} config Config object.
   * @return {RegistersController | *}
   */
  constructor(config) {
    // Define singleton.
    if (!RegistersController.singleton) {
      super(config);
      this.registerModel = RegisterModel.getInstance();
      this.keyModel = KeyModel.getInstance();
      this.recordModel = RecordModel.getInstance();
      this.registerBusiness = new RegisterBusiness(config);
      RegistersController.singleton = this;
    }

    return RegistersController.singleton;
  }

  /**
   * Get all.
   */
  async getAll(req: Request, res: Response) {
    // Define params.
    const {
      offset,
      limit,
      parent_id: parentId,
      id,
      key_id: keyId,
      name
    } = {
      offset: 0,
      limit: 20,
      ...matchedData(req, { locations: ['query'] })
    } as any;

    const filter: { id?: number; parent_id?: number; ['$keys.id$']?: number; name?: string } = {};
    if (id) filter.id = id;
    if (parentId) filter.parent_id = parentId;
    if (keyId) filter['$keys.id$'] = keyId;
    if (name) filter.name = name;

    // Get registers.
    let registersModelResponse;
    try {
      registersModelResponse = await this.registerModel.getAll({
        offset: offset,
        limit: Math.min(limit, this.config.pagination.maxLimit),
        filter
      });
    } catch (error) {
      this.log.save('get-registers-error', { error: error && error.message });
    }
    const { data: registers, meta } = registersModelResponse || {};

    this.responseData(res, registers, meta);
  }

  /**
   * Find by ID.
   */
  async findById(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });

    // Get register.
    let registerModelResponse;
    try {
      registerModelResponse = await this.registerModel.findById(id);
    } catch (error) {
      this.log.save('get-register-by-id-error', { error: error && error.message });
    }
    const { data: register } = registerModelResponse || {};

    // Check.
    if (!register) return this.responseError(res, 'Not found.', 404);

    this.responseData(res, register);
  }

  /**
   * Export by ID.
   */
  async export(req: Request, res: Response) {
    // Run GC.
    if (global.gc) {
      global.gc();
    }

    // Define params.
    const { id: registerId } = matchedData(req, { locations: ['params'] });
    const { with_data: withData, file, key_ids: keyIds } = matchedData(req, { locations: ['query'] });

    if (!registerId) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-id-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    // Get register.
    let registerModelResponse;
    try {
      registerModelResponse = await this.registerModel.findById(registerId);
    } catch {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-find-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }
    const { data: register } = registerModelResponse || {};

    // Check register exist.
    if (!register) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-existence-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    // Get all keys.
    let keysModelResponse;
    try {
      keysModelResponse = await this.keyModel.getAll({
        offset: 0,
        limit: null,
        filter: {
          register_id: registerId,
          ...(keyIds ? { id: keyIds.split(',').map((keyId) => parseInt(keyId, 10)) } : {})
        }
      });
    } catch (error) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-keys-error', error);
      return this.responseError(res, errorObject.message, errorObject.code);
    }
    const { data: registerKeysData, meta: registerKeysMeta } = keysModelResponse || {};
    register.keys = { data: registerKeysData, count: registerKeysMeta.count };

    // Define register without data.
    const registerWithoutData = JSON.parse(JSON.stringify(register));

    if (withData) {
      for (const index in register.keys.data) {
        const key = register.keys.data[index];

        // Backward compatibility: remove after implementation on bpmn-admin.
        key.lock = key?.accessMode === 'read_only';

        if (!key.id) continue;

        const countRecordsModelResponse = await this.recordModel.countAll({
          filter: {
            register_id: registerId,
            key_id: parseInt(key.id)
          }
        });
        if (countRecordsModelResponse > this.config.pagination.maxExportLimit) {
          const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-max-limit-reached', null, {
            recordsCount: countRecordsModelResponse,
            maxExportLimit: this.config.pagination.maxExportLimit
          });
          return this.responseError(res, errorObject.message, errorObject.code);
        }

        // Get records.
        let recordsModelResponse;
        try {
          recordsModelResponse = await this.recordModel.getAll({
            offset: 0,
            limit: null,
            filter: {
              register_id: registerId,
              key_id: parseInt(key.id)
            }
          });
        } catch (error) {
          const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-records-error', error);
          return this.responseError(res, errorObject.message, errorObject.code);
        }
        const { data: records, meta: recordsMeta } = recordsModelResponse || {};
        register.keys.data[index].records = { data: records, count: recordsMeta.count };
      }
    }

    // Check if file should be returned.
    if (file) {
      res.set('Content-Type', 'text/plain');
      res.set('Content-Disposition', `attachment; filename="register-${registerId}.dat"`);
      // register.keys.data[index].records = { data: records, count: recordsMeta.count };

      // Response chunk with register struct.
      const structChunk = `${JSON.stringify(registerWithoutData)}\n`;
      res.write(structChunk);

      // Append records.
      for (let i = 0; i < register.keys.data.length; i++) {
        if (!register.keys.data[i].records) {
          continue;
        }
        for (let j = 0; j < register.keys.data[i].records.data.length; j++) {
          const chunk = `${i}-${j}-${JSON.stringify(register.keys.data[i].records.data[j])}\n`;
          res.write(chunk);
        }
      }
      res.end();
    } else {
      // Response JSON.
      this.responseData(res, register);
    }

    // Run GC.
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Import by ID.
   */
  async import(req: Request, res: Response) {
    // Run GC.
    if (global.gc) {
      global.gc();
    }

    // Define params.
    let registerId;
    let { data: importRegister } = matchedData(req, { locations: ['body'] });
    const {
      force,
      rewrite_schema: doRewriteKeysSchema,
      clear_records: doClearOriginalRecords,
      add_data: doImportRecords,
      file
    } = matchedData(req, { locations: ['query'] });
    const { user } = req.auth;
    const backupInfo = {
      importKeys: {}, // Need for clear records
      originalKeys: {}, // Need for clear records and records import and rewrite schema
      changes: {}
    };

    if (file) {
      // Read from stream.
      let fileContentBuffer;
      let chunks = [];
      req.on('data', (data) => chunks.push(data));
      req.on('end', () => {
        fileContentBuffer = Buffer.concat(chunks);
        chunks = [];
      });
      await Stream.waitEndEvent(req);

      // GC.
      chunks = [];
      if (global.gc) {
        global.gc();
      }

      // Define file content lines.
      const fileContentParts = fileContentBuffer.toString('utf8').split('\n');

      // Define Register struct from first line.
      const registerStruct = fileContentParts.shift();
      importRegister = JSON.parse(registerStruct);
      let currentRecord = fileContentParts.shift();
      const recordLineTemplate = /(^[0-9]+)-([0-9]+)-(.+$)/;
      while (currentRecord) {
        // Parse line.
        const [keyIndexString, , recordDataString] = currentRecord.match(recordLineTemplate).splice(1);
        const registerIndex = parseInt(keyIndexString);
        // const recordIndex = parseInt(recordIndexString);
        const recordData = JSON.parse(recordDataString);

        // Append register info object.
        if (!importRegister.keys.data[registerIndex].records) {
          importRegister.keys.data[registerIndex].records = { data: [] };
        }
        importRegister.keys.data[registerIndex].records.data.push(recordData);

        // Define next line.
        currentRecord = fileContentParts.shift();
      }
    }

    // Check.
    if (!importRegister) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-empty-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    registerId = importRegister.id ? parseInt(importRegister.id) : false;

    // Update original register (or create if not exists) info and get it.
    importRegister.user = user;
    let originalRegister;
    try {
      let registerModelResponse;
      // Try to find.
      try {
        if (importRegister.id) registerModelResponse = await this.registerModel.findById(importRegister.id);
      } catch (error) {
        this.log.save('import-register-try-to-find', { error: error.toString() });
      }

      // Response error if not force on existing register
      if (!force && registerModelResponse) {
        const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-exist');
        return this.responseError(res, errorObject.message, errorObject.code);
      }

      // Create or Update.
      if (!registerModelResponse) {
        // Create new if not found.
        registerModelResponse = await this.registerModel.create({
          ...importRegister,
          meta: {
            ...importRegister.meta,
            ...(req.accessInfo && {
              createdByPerson: { userId: req.accessInfo?.userId, name: req.accessInfo?.userName }
            })
          }
        });
      } else {
        // Update.
        registerModelResponse = await this.registerModel.update(importRegister.id, {
          ...importRegister,
          meta: {
            ...importRegister.meta,
            ...(req.accessInfo && {
              updatedByPerson: { userId: req.accessInfo?.userId, name: req.accessInfo?.userName }
            })
          }
        });
      }

      originalRegister = registerModelResponse.data;
    } catch (error) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-update-error', error);
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    // Check necessity.
    if (!this.registerBusiness.needImport(doRewriteKeysSchema, doClearOriginalRecords, doImportRecords)) {
      return this.responseData(res, { isAccepted: true }, undefined, 202);
    }

    // Check existence.
    if (!originalRegister) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-not-found-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    if (!registerId) registerId = parseInt(originalRegister.id);

    // Get original keys.
    let originalKeys;
    try {
      originalKeys = await this.registerBusiness.getExistingRegisterKeys(
        registerId,
        importRegister.keys.data.map(({ id }) => id)
      );
    } catch (error) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-keys-error', error);
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    // Get original records and fill backup (need for records import and clear records).
    if (originalKeys) {
      for (const originalKey of originalKeys) {
        // Get original records.
        let records = [];
        try {
          records = await this.registerBusiness.getExistingRegisterKeyRecords(registerId, parseInt(originalKey.id));
        } catch (error) {
          const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-records-error', error);
          return this.responseError(res, errorObject.message, errorObject.code);
        }

        // Fill backup for originals.
        backupInfo.originalKeys[originalKey.id] = records ? records.map((currentValue) => currentValue.id) : [];
      }
    }

    // Fill backup with import records (need when clear records).
    if (doClearOriginalRecords && importRegister.keys && importRegister.keys.data) {
      for (const importKey of importRegister.keys.data) {
        backupInfo.importKeys[importKey.id] = importKey.records ? importKey.records.data.map((currentValue) => currentValue.id) : [];
      }
    }

    // Data import.
    if (file) {
      // Response first chunk.
      res.set('Content-Type', 'application/json');
      res.set('Transfer-Encoding', 'chunked');
      res.write('{"data":{');
      res.write('"preparing": true,');
      res.write('"processing": true,');
    }
    if ((doRewriteKeysSchema || doImportRecords) && importRegister.keys.data) {
      // Response 202 if file and continue handling.
      const alreadyImportedOrExistedKeys = Object.keys(backupInfo.originalKeys).map((keyId) => parseInt(keyId));
      const importKeysPrepared = importRegister.keys.data || [];
      const maxSwapCount = importKeysPrepared.length;
      let swapCount = 0;

      if (file) {
        res.write('"import": [');
        res.write(`{"registerId": ${registerId}}`);
      }
      while (importKeysPrepared.length) {
        const importKey = importKeysPrepared.shift();
        if (swapCount > maxSwapCount) {
          const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-cycle-keys-parents');
          return this.responseError(res, errorObject.message, errorObject.code);
        }
        if (importKey.parentId && !alreadyImportedOrExistedKeys.includes(parseInt(importKey.parentId))) {
          importKeysPrepared.push(importKey);
          swapCount++;
          continue;
        }

        importKey.registerId = registerId;
        if (file) {
          res.write(`,{"keyId": ${importKey.id}}`);
        }

        // Update existing key or create new key.
        const keyExistInOriginals = importKey.id && backupInfo.originalKeys[importKey.id];
        let keyModelResponse;
        importKey.registerId = registerId;
        importKey.user = user;
        if (keyExistInOriginals) {
          // Update existing key

          // Delete schema from update data if not necessary
          if (!doRewriteKeysSchema) delete importKey.schema;

          try {
            keyModelResponse = await this.keyModel.update(parseInt(importKey.id), {
              ...importKey,
              meta: {
                ...importKey.meta,
                ...(req.accessInfo && {
                  updatedByPerson: { userId: req.accessInfo?.userId, name: req.accessInfo?.userName }
                })
              }
            });
            backupInfo.changes = this.registerBusiness.changes(backupInfo.changes, 'updated', keyModelResponse.data.id);
          } catch (error) {
            const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-update-key-error', error);
            return this.responseError(res, errorObject.message, errorObject.code);
          }
        } else {
          // Create new key
          try {
            keyModelResponse = await this.keyModel.create({
              ...importKey,
              meta: {
                ...importKey.meta,
                ...(req.accessInfo && {
                  createdByPerson: { userId: req.accessInfo?.userId, name: req.accessInfo?.userName }
                })
              }
            });
            backupInfo.changes = this.registerBusiness.changes(backupInfo.changes, 'created', keyModelResponse.data.id);
          } catch (error) {
            const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-create-key-error', error);
            return this.responseError(res, errorObject.message, errorObject.code);
          }
        }
        const { data: keyModel } = keyModelResponse || {};

        // Check key existence.
        if (!keyModel) {
          const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-create-or-update-key-error');
          return this.responseError(res, errorObject.message, errorObject.code);
        }

        // Update or add records.
        if (doImportRecords && importKey.records && importKey.records.data) {
          for (const importKeyRecord of importKey.records.data) {
            // Check request data.
            if (importKeyRecord.registerId && registerId !== parseInt(importKeyRecord.registerId)) {
              const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-record-register-id-error');
              return this.responseError(res, errorObject.message, errorObject.code);
            }

            if (importKeyRecord.keyId && parseInt(keyModel.id) !== parseInt(importKeyRecord.keyId)) {
              const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-record-key-id-error');
              return this.responseError(res, errorObject.message, errorObject.code);
            }

            // Update existing key record or create new key record.
            if (importKey.toSearchString.startsWith('(')) {
              const isolate = new Isolation();
              importKeyRecord.searchString = isolate.set('importKeyRecord', importKeyRecord).eval(`(${importKey.toSearchString})(importKeyRecord)`);
            }
            const keyRecordExistInOriginals =
              importKeyRecord.id && backupInfo.originalKeys[keyModel.id] && backupInfo.originalKeys[keyModel.id].includes(importKeyRecord.id);

            let recordModelResponse;
            importKeyRecord.registerId = registerId;
            importKeyRecord.keyId = keyModel.id;
            importKeyRecord.user = user;
            if (keyRecordExistInOriginals) {
              // Update existing record
              try {
                recordModelResponse = await this.recordModel.update(importKeyRecord.id, importKeyRecord);
                backupInfo.changes = this.registerBusiness.changes(backupInfo.changes, 'updated', keyModel.id, recordModelResponse.data.id);
              } catch (error) {
                const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-update-record-error', error);
                return this.responseError(res, errorObject.message, errorObject.code);
              }
            } else {
              // Create new record
              try {
                recordModelResponse = await this.recordModel.create(importKeyRecord);
                backupInfo.changes = this.registerBusiness.changes(backupInfo.changes, 'created', keyModel.id, recordModelResponse.data.id);
              } catch (error) {
                const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-create-record-error', error);
                return this.responseError(res, errorObject.message + ' Record id:' + importKeyRecord.id, errorObject.code);
              }
            }
            const { data: recordModel } = recordModelResponse || {};

            // Check.
            if (!recordModel) {
              const errorObject = this.registerBusiness.getErrorAndLogIt('import-register-create-or-update-record-error');
              return this.responseError(res, errorObject.message, errorObject.code);
            }
            if (file) {
              res.write(`,{"recordId": "${recordModel.id}"}`);
            }
          }
        }

        alreadyImportedOrExistedKeys.push(parseInt(importKey.id));
      }
      if (file) {
        res.write('],');
      }
    }

    // Data (records) clearing.
    if (doClearOriginalRecords) {
      // Delete original records except(exclude) import records
      for (const keyId in backupInfo.originalKeys) {
        const importBackupKey = backupInfo.importKeys[keyId] || [];
        const recordsToDeleteIds = backupInfo.originalKeys[keyId].filter((element) => !doImportRecords || !importBackupKey.includes(element));
        for (const recordToDeleteId of recordsToDeleteIds) {
          await this.recordModel.delete(recordToDeleteId, user);
          backupInfo.changes = this.registerBusiness.changes(backupInfo.changes, 'deleted', keyId, recordToDeleteId);
        }
      }
    }

    // Response.
    if (file) {
      res.write('"done": true');
      res.end('}}');
    } else {
      this.responseData(res, { isAccepted: true, changes: backupInfo.changes }, undefined, 202);
    }

    // Run GC.
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Export by ID with stream.
   */
  async streamExport(req: Request, res: Response) {
    const { id: registerId } = matchedData(req, { locations: ['params'] });
    const { with_data: withData, file } = matchedData(req, { locations: ['query'] });

    let registerModelResponse;
    try {
      registerModelResponse = await this.registerModel.findById(registerId);
    } catch {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-find-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }
    const { data: register } = registerModelResponse || {};

    if (!register) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-existence-error');
      return this.responseError(res, errorObject.message, errorObject.code);
    }

    if (file) {
      res.set('Content-Type', 'text/plain');
      res.set('Content-Disposition', `attachment; filename="register-${registerId}.dat"`);
    }

    let keysModelResponse;
    try {
      keysModelResponse = await this.keyModel.getAll({
        offset: 0,
        limit: null,
        filter: {
          register_id: registerId
        }
      });
    } catch (error) {
      const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-keys-error', error);
      return this.responseError(res, errorObject.message, errorObject.code);
    }
    const { data: registerKeysData, meta: registerKeysMeta } = keysModelResponse || {};

    // Backward compatibility: remove after implementation on bpmn-admin.
    registerKeysData.forEach((item) => (item.lock = item.accessMode === 'read_only'));

    register.keys = { data: registerKeysData, count: registerKeysMeta.count };

    res.write(JSON.stringify(register) + this.exportImportRegisterUuid);

    if (withData) {
      for (const { id = undefined } of register.keys.data) {
        if (!id) continue;

        let recordsModelResponse;
        try {
          recordsModelResponse = await this.recordModel.getAll({
            offset: 0,
            limit: null,
            filter: {
              register_id: registerId,
              key_id: parseInt(id)
            }
          });
        } catch (error) {
          const errorObject = this.registerBusiness.getErrorAndLogIt('export-register-records-error', error);
          return this.responseError(res, errorObject.message, errorObject.code);
        }
        recordsModelResponse?.data?.forEach((item) => res.write(`${this.exportImportRecordUuid}${JSON.stringify(item)}`));
      }
    }

    res.end();
  }

  /**
   * Import with stream .
   */
  async streamImport(req: Request, res: Response) {
    const { clear_records: isClearRecords } = matchedData(req, { locations: ['query'] });
    const { user } = req.auth;
    const uniqueKeys = new Set();

    const changes = {
      created: {
        registers: [],
        keys: [],
        records: []
      },
      deleted: {
        registers: [],
        keys: [],
        records: []
      },
      updated: {
        registers: [],
        keys: [],
        records: []
      }
    };

    let isRegisterStructHandled = false;
    let registerRestRecordFlag = true;
    let registerChunkData = '';
    let registerRestRecordsChunkData = '';
    let recordsChunkData = '';
    req.on('data', async (chunk) => {
      req.pause();
      const headerName = '\r\n------WebKitFormBoundary';
      const headerContentType = 'Content-Type: application/octet-stream';
      let data = chunk.toString('utf8');

      // Remove headers.
      if (data.includes(headerContentType)) {
        data = data.split(headerContentType)[1];
      }
      if (data.includes(headerName)) {
        data = data.split(headerName)[0];
      }
      if (!isRegisterStructHandled) {
        if (data.includes(this.exportImportRegisterUuid)) {
          // Проблема будет если uuid разорвет на chunkи
          registerChunkData += data.split(this.exportImportRegisterUuid)[0];
        } else {
          registerChunkData += data;
        }
        if (this.countBrackets(registerChunkData)) {
          const registerStruct = JSON.parse(registerChunkData);
          registerChunkData = data.split(this.exportImportRegisterUuid)[1] || '';
          isRegisterStructHandled = true;
          const { id, name, description, parentId, meta, keys } = registerStruct;
          let registerModelResponse;
          try {
            if (id) registerModelResponse = await this.registerModel.findById(id);
          } catch {
            // nothing to do
          }

          // Create or update register.
          try {
            if (!registerModelResponse) {
              await this.registerModel.create({ id, name, description, parentId, meta, user });
              changes.created.registers.push(id);
            } else {
              await this.registerModel.update(id, { name, description, parentId, meta, user });
              changes.updated.registers.push(id);
            }
          } catch {
            this.registerBusiness.getErrorAndLogIt('import-register-create-or-update-record-error');
          }

          // Create or update keys.
          for (const key of keys.data) {
            const { id, registerId, name, description, schema, parentId, meta, toString, toSearchString, lock, accessMode } = key;
            uniqueKeys.add(id);
            let keyModelResponse;
            try {
              if (id) keyModelResponse = await this.keyModel.findById(id);
            } catch (error) {
              this.log.save('import-register-try-to-find', { error: error.toString() });
            }

            try {
              if (!keyModelResponse) {
                await this.keyModel.create({
                  id,
                  registerId,
                  name,
                  description,
                  schema,
                  parentId,
                  meta,
                  toString,
                  toSearchString,
                  lock,
                  accessMode,
                  user
                });
                changes.created.keys.push(id);
              } else {
                await this.keyModel.update(id, {
                  registerId,
                  name,
                  description,
                  schema,
                  parentId,
                  meta,
                  toString,
                  toSearchString,
                  lock,
                  accessMode,
                  user
                });
                changes.updated.keys.push(id);
              }
            } catch (error) {
              this.registerBusiness.getErrorAndLogIt('import-key-update-error', error);
              // TO DO return respError
            }
          }
        }
      } else {
        const splitedData = data.split(this.exportImportRecordUuid).filter(Boolean);
        const firstItem = splitedData[0];
        const lastItem = splitedData.at(-1);
        if (!this.countBrackets(firstItem)) {
          if (registerRestRecordFlag) {
            registerRestRecordsChunkData += firstItem;
            registerRestRecordFlag = false;
          } else {
            recordsChunkData += firstItem;
          }
          splitedData.shift();
        }
        if (!this.countBrackets(lastItem)) {
          recordsChunkData += this.exportImportRecordUuid + lastItem;
          splitedData.pop();
        }
        const { createdRecords, updatedRecords } = await this.handleImportRecord(splitedData, user);
        changes.created.records.push(...createdRecords);
        changes.updated.records.push(...updatedRecords);
      }

      // Handle case where registerStruct and rest data came in one chunk and there won't be chunks anymore
      if (registerChunkData && isRegisterStructHandled) {
        if (this.countBrackets(registerChunkData) && registerChunkData.includes(headerName)) {
          registerChunkData = registerChunkData.split(headerName)[0];
          const { createdRecords, updatedRecords } = await this.handleImportRecord(registerChunkData.split(this.exportImportRecordUuid), user);
          changes.created.records.push(...createdRecords);
          changes.updated.records.push(...updatedRecords);
        } else {
          registerRestRecordsChunkData += registerChunkData;
        }
        registerChunkData = '';
      }
      req.resume();
    });

    await Stream.waitEndEvent(req);

    // Handle disrupted chunks.
    for (const item of [registerRestRecordsChunkData, recordsChunkData]) {
      if (this.countBrackets(item)) {
        const { createdRecords, updatedRecords } = await this.handleImportRecord(item.split(this.exportImportRecordUuid), user);
        changes.created.records.push(...createdRecords);
        changes.updated.records.push(...updatedRecords);
      }
    }

    // Clear old keys records if need
    if (isClearRecords) {
      const recordsIds = [...new Set([...changes.created.records, ...changes.updated.records])];
      for (const key of uniqueKeys) {
        const { data: records } = await this.recordModel.getByKeyId(key as number);
        for (const { id } of records) {
          if (!recordsIds.length || recordsIds.includes(id)) continue;
          await this.recordModel.delete(id);
          changes.deleted.records.push(id);
        }
      }
    }

    this.responseData(res, changes);
  }

  /**
   * Create.
   */
  async create(req: Request, res: Response) {
    // Define params.
    const { name, description, parentId, meta } = matchedData(req, { locations: ['body'] });
    const { user } = req.auth;

    // Get registers.
    let registerModelResponse;
    try {
      registerModelResponse = await this.registerModel.create({ name, description, parentId, meta, user });
    } catch (error) {
      this.log.save('create-register-error', { error: error && error.message });
      return this.responseError(res, 'Create register error.', 400, error.message);
    }
    const { data: register } = registerModelResponse || {};

    // Check.
    if (!register) return this.responseError(res, 'Can not create.', 500);

    // Response.
    this.responseData(res, register);
  }

  /**
   * Update.
   */
  async update(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const { name, description, parentId, meta } = matchedData(req, { locations: ['body'] });
    const { user } = req.auth;

    // Get registers.
    let registerModelResponse;
    try {
      registerModelResponse = await this.registerModel.update(id, {
        name,
        description,
        parentId,
        meta,
        user
      });
    } catch (error) {
      this.log.save('update-register-error', { error: error && error.message });
    }
    const { data: register } = registerModelResponse || {};

    // Check.
    if (!register) return this.responseError(res, 'Can not update.', 500);

    // Response.
    this.responseData(res, register);
  }

  /**
   * Delete.
   */
  async delete(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });

    // Delete register.
    let deletedRowsCountModelResponse;
    try {
      deletedRowsCountModelResponse = await this.registerModel.delete(id);
    } catch (error) {
      this.log.save('delete-register-error', { error: error?.message });
      if (error?.message?.indexOf(DB_ERROR_KEYS_EXIST) > -1) {
        return this.responseError(res, 'Can not delete. You should delete keys in register.', 500);
      }
      return this.responseError(res, 'Can not delete. ', 500);
    }

    // Check.
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Not deleted.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }

  // Private func.
  countBrackets(data) {
    let openBrackets = 0;
    let closeBrackets = 0;
    openBrackets += (data.match(/{/g) || []).length;
    closeBrackets += (data.match(/}/g) || []).length;
    if (openBrackets === 0 && closeBrackets === 0) return false;
    return openBrackets === closeBrackets;
  }

  // Private func.
  async handleImportRecord(data, user) {
    const createdRecords = [];
    const updatedRecords = [];
    for (const item of data.filter(Boolean)) {
      try {
        const { id, registerId, keyId, data, meta, allowTokens, searchString, searchString2, searchString3, person } = JSON.parse(item) || {};
        let recordModelResponse;
        try {
          if (id) recordModelResponse = await this.recordModel.findById(id);
        } catch (error) {
          this.log.save('import-record-try-to-find', { error: error.toString() });
        }
        try {
          if (!recordModelResponse) {
            await this.recordModel.create({
              id,
              registerId,
              keyId,
              data,
              meta,
              allowTokens,
              user,
              searchString,
              searchString2,
              searchString3,
              person
            });
            createdRecords.push(id);
          } else {
            await this.recordModel.update(id, { registerId, keyId, data, meta, user, person });
            updatedRecords.push(id);
          }
        } catch (error) {
          this.registerBusiness.getErrorAndLogIt('import-record-create-or-update-error', error);
        }
      } catch (error) {
        this.log.save('import-record-invalid-json', { error: error?.message });
      }
    }
    return { createdRecords, updatedRecords };
  }
}
