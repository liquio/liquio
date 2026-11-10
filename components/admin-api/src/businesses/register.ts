import _ from 'lodash';
import { getRegisterApiClient, RegisterApiClient } from '@liquio/back-core';
import xlsx from 'node-xlsx';

import { Exceptions } from '../exceptions';
import { callRegisterLegacy } from '../lib/register_api';
import { PublicError } from '../lib/public_error';
import { getConfig, getLog } from '../lib/context';

/**
 * Register business.
 */
export class RegisterBusiness {
  private static singleton: RegisterBusiness;

  public config: any;
  private registerService: RegisterApiClient;
  private importXlsxBatchSize: number;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config?) {
    // Define singleton.
    if (!RegisterBusiness.singleton) {
      this.config = config;
      this.registerService = getRegisterApiClient();
      this.importXlsxBatchSize = getConfig().register?.importXlsx?.batchSize || 256;
      RegisterBusiness.singleton = this;
    }

    // Return singleton.
    return RegisterBusiness.singleton;
  }

  /**
   * Get registers with pagination.
   * @param {object} params Params.
   * @param {number} params.id ID.
   * @param {number} params.key_id Key ID.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @returns {Promise<object[]>}
   */
  async getRegistersWithPagination({ id, key_id, name, offset, limit }) {
    const registers = await callRegisterLegacy(
      'register-request-get-registers-error',
      () => this.registerService.getRegisters({ id, key_id, name, offset, limit }),
      'body',
    );

    return registers;
  }

  /**
   * Get registers.
   * @returns {Promise<object[]>}
   */
  async getRegisters() {
    let registers = await callRegisterLegacy(
      'register-request-get-registers-error',
      () => this.registerService.getRegisters({ offset: 0, limit: 1000 }),
      'body',
    );

    if (registers && registers.data) {
      registers = registers.data.map((v) => {
        return {
          id: v.id,
          name: v.name,
          parentId: v.parentId,
          description: v.description,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        };
      });
    } else {
      registers = [];
    }

    return registers;
  }

  /**
   * Find register by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findRegisterById(id) {
    const register = await callRegisterLegacy('register-request-get-register-error', () => this.registerService.findRegisterById(id), 'undefined');

    return register;
  }

  /**
   * Create register.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createRegister(data, accessInfo) {
    const register = await callRegisterLegacy(
      'register-request-post-register-error',
      () => this.registerService.createRegister(data, { accessInfo }),
      'undefined',
    );

    return register;
  }

  /**
   * Update register.
   * @param {number} id ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async updateRegisterById(id, data, accessInfo) {
    const register = await callRegisterLegacy(
      'register-request-put-register-error',
      () => this.registerService.updateRegisterById(id, data, { accessInfo }),
      'undefined',
    );

    return register;
  }

  /**
   * Delete register.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteRegisterById(id, accessInfo) {
    const register = await callRegisterLegacy(
      'register-request-delete-register-error',
      () => this.registerService.deleteRegisterById(id, { accessInfo }),
      'undefined',
    );

    return register;
  }

  /**
   * Get keys with pagination.
   * @param {object} params Params.
   * @param {number} params.register_id Register ID.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @returns {Promise<object[]>}
   */
  async getKeysWithPagination({ register_id, offset, limit }) {
    const keys = await callRegisterLegacy(
      'register-request-get-keys-error',
      () => this.registerService.getKeys({ register_id, offset, limit }),
      'body',
    );

    return keys;
  }

  /**
   * Get keys.
   * @param {object} params Params.
   * @param {number} params.register_id Register ID.
   * @returns {Promise<object[]>}
   */
  async getKeys({ register_id }) {
    let keys = await callRegisterLegacy(
      'register-request-get-keys-error',
      () => this.registerService.getKeys({ register_id, offset: 0, limit: 1000 }),
      'body',
    );

    if (keys && keys.data) {
      keys = keys.data.map((v) => {
        return {
          id: v.id,
          registerId: v.registerId,
          name: v.name,
          parentId: v.parentId,
          description: v.description,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          keySignature: v.keySignature,
        };
      });
    } else {
      keys = [];
    }

    return keys;
  }

  /**
   * Find key by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findKeyById(id) {
    const key = await callRegisterLegacy('register-request-get-keys-error', () => this.registerService.findKeyById(id), 'undefined');

    return key;
  }

  /**
   *
   * @param {number} keyId
   * @param {string} mapping
   * @returns
   */
  async updateIndexMapping(keyId, mapping) {
    return callRegisterLegacy(
      'register-request-put-key-index-mapping-error',
      () => this.registerService.updateKeyIndexMapping(keyId, mapping),
      'undefined',
    );
  }

  /**
   * get synced keys.
   * @param {number} ids IDs.
   * @returns {Promise<object>}
   */
  async getSyncedKeys(ids) {
    const keys = await callRegisterLegacy('register-request-get-synced-keys-error', () => this.registerService.getSyncedKeys(ids), 'undefined');

    return keys;
  }

  /**
   * get all synced keys.
   * @returns {Promise<object>}
   */
  async getAllSyncedKeys() {
    const keys = await callRegisterLegacy('register-request-get-keys-error', () => this.registerService.getAllSyncedKeys(), 'undefined');

    return keys;
  }

  /**
   * Create key.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createKey(data, accessInfo) {
    const key = await callRegisterLegacy('register-request-post-key-error', () => this.registerService.createKey(data, { accessInfo }), 'undefined');

    return key;
  }

  /**
   * Update key.
   * @param {number} id ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async updateKeyById(id, data, accessInfo) {
    const key = await callRegisterLegacy(
      'register-request-put-key-error',
      () => this.registerService.updateKeyById(id, data, { accessInfo }),
      'undefined',
    );

    return key;
  }

  /**
   * Delete key.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteKeyById(id, accessInfo) {
    const key = await callRegisterLegacy(
      'register-request-delete-key-error',
      () => this.registerService.deleteKeyById(id, { accessInfo }),
      'undefined',
    );

    return key;
  }

  /**
   * Get records.
   * @param {object} params Params.
   * @param {number} params.register_id Register ID.
   * @param {number} params.key_id Key ID.
   * @param {number} params.offset Offset.
   * @param {number} params.limit Limit.
   * @returns {Promise<object[]>}
   */
  async getRecords({ register_id, key_id, offset, limit }) {
    const keys = await callRegisterLegacy(
      'register-request-get-records-error',
      () => this.registerService.getRecords({ register_id, key_id, offset, limit, allow_see_all_records: true }),
      'body',
    );

    return keys;
  }

  /**
   * Find record by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findRecordById(id) {
    const record = await callRegisterLegacy('register-request-get-record-by-id-error', () => this.registerService.findRecordById(id), 'undefined');

    return record;
  }

  /**
   * Create record.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createRecord(data, accessInfo) {
    const record = await callRegisterLegacy(
      'register-request-post-record-error',
      () => this.registerService.createRecord(data, { accessInfo }),
      'undefined',
    );

    return record;
  }

  /**
   * Import bulk records.
   * @param {object} params Params.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async importBulkRecords(params, records, accessInfo) {
    const record = await callRegisterLegacy(
      'register-request-post-record-error',
      () => this.registerService.importBulkRecords({ ...params, records }, { accessInfo }),
      'undefined',
    );

    return record;
  }

  /**
   * Update record.
   * @param {number} id ID.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async updateRecordById(id, data, accessInfo) {
    const record = await callRegisterLegacy(
      'register-request-put-record-error',
      () => this.registerService.updateRecordById(id, data, { accessInfo }),
      'undefined',
    );

    return record;
  }

  /**
   * Delete record.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteRecordById(id, accessInfo) {
    const record = await callRegisterLegacy(
      'register-request-delete-record-error',
      () => this.registerService.deleteRecordById(id, { accessInfo, body: {} }),
      'undefined',
    );

    return record;
  }

  /**
   * Export register.
   * @param {number} id Register ID.
   * @param {object} params Params.
   * @param {boolean} params.withData With data.
   * @param {boolean} params.file File.
   * @returns {Promise<object>}
   */
  async export(id, params) {
    let register;
    try {
      const { withData, file, keyIds } = params;
      if (file) {
        register = await this.registerService.exportRegisterFile(id, { withData, keyIds }, { timeout: 0 });
      } else {
        register = await callRegisterLegacy(
          'register-request-export-error',
          () => this.registerService.exportRegister(id, { withData, keyIds }, { timeout: 0 }),
          'body',
        );
      }
    } catch (error) {
      getLog().save('register-export-error', error);
      throw error;
    }

    return register;
  }

  /**
   * Import register.
   * @param {object} params Params.
   * @param {boolean} params.force Force.
   * @param {boolean} params.rewriteSchema Rewrite schema.
   * @param {boolean} params.clearRecords Clear Records.
   * @param {boolean} params.addData Add data.
   * @param {boolean} params.file File.
   * @param {string} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async import({ force, rewriteSchema, clearRecords, addData, file }, data, accessInfo) {
    try {
      if (file) {
        return await this.registerService.importRegisterFile({ force, rewriteSchema, clearRecords, addData }, data, { accessInfo, timeout: 0 });
      }
      data = JSON.parse(data);
      return await callRegisterLegacy(
        'register-request-import-error',
        () => this.registerService.importRegister({ force, rewriteSchema, clearRecords, addData }, data, { accessInfo, timeout: 0 }),
        'undefined',
      );
    } catch (error) {
      getLog().save('register-import-error', error);
      if (error && error.message && error.message === '"Register already exists."') {
        throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.REGISTER);
      }
      throw error;
    }
  }

  /**
   * Stream export register.
   * @param {number} id Register ID.
   * @param {object} params Params.
   * @param {boolean} params.withData With data.
   * @param {boolean} params.file File.
   * @returns {Promise<object>}
   */
  async streamExport(id, { withData, file }) {
    let register;
    try {
      register = await this.export(id, { withData, file });
    } catch (error) {
      getLog().save('register-export-error', error);
      throw error;
    }

    return register;
  }

  /**
   * Stream import register.
   * @param {object} params Params.
   * @param {boolean} params.clearRecords Clear Records.
   * @param {object} body Request stream.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async streamImport(clearRecords, body, accessInfo) {
    return this.registerService.streamImportRegister({ clearRecords }, body, { accessInfo, timeout: 0 });
  }

  /**
   * Import records by xlsx.
   * @param {object} params Params.
   * @param {number} params.registerId Register ID.
   * @param {number} params.keyId Key ID.
   * @param {number} params.unique Unique.
   * @param {boolean} params.clearRecords Clear records.
   * @param {string} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<boolean>}
   */
  async importXlsx({ registerId, keyId, unique, clearRecords = false }, data, accessInfo) {
    try {
      const keyOrigin = await this.findKeyById(keyId);
      if (keyOrigin?.registerId !== registerId) throw new PublicError('keyId has no relations with registerId');

      const loadedRecords = [];

      const time = Date.now();
      const xlsxParsed = xlsx.parse(data);
      getLog().save('register-import-xlsx-parsed', { time: Date.now() - time, size: data.length, sheets: xlsxParsed.length });

      let recordsToCreate = [];
      const batchResults = [];
      for (const paper of xlsxParsed) {
        if (!Array.isArray(paper.data)) {
          continue;
        }

        const namesOfColumns = paper.data.shift();

        // make string '[element1,element2]' as array
        const dataFixedArray = paper.data.map((a) =>
          a.map((item) => {
            const match = `${item}`.match(/^_JSON:(.+)$/);
            return match ? JSON.parse(match[1]) : item;
          }),
        );

        for (const columns of dataFixedArray) {
          if (!columns.length) {
            continue;
          }
          const item = _.zipObject(
            namesOfColumns,
            columns.map((v) => (typeof v === 'string' ? (v.length > 0 ? v.trim() : undefined) : v)),
          );

          if (unique) {
            const { data: records } = await callRegisterLegacy(
              'register-request-get-records-error',
              () =>
                this.registerService.getRecords({
                  key_id: keyId,
                  [`data[${unique}]`]: item[unique],
                  limit: 1,
                  allow_see_all_records: true,
                }),
              'body',
            );
            if (records && records.length > 0) {
              const { id: recordId } = await callRegisterLegacy(
                'register-request-put-record-error',
                () => this.registerService.updateRecordById(records[0].id, { registerId, keyId, data: item }, { accessInfo }),
                'undefined',
              );

              loadedRecords.push(recordId);
              getLog().save('register-import-xlsx-item-updated', item);
              continue;
            }
          }

          recordsToCreate.push(item);

          getLog().save('register-import-xlsx-item-saving', item);

          // Batch records and clear the buffer.
          if (recordsToCreate.length >= this.importXlsxBatchSize) {
            batchResults.push(
              this.importXlsxBatch({ registerId, keyId }, recordsToCreate, accessInfo).then((ids) => {
                loadedRecords.push(...ids);
              }),
            );
            recordsToCreate = [];
          }
        }
      }

      // Import the rest of the records.
      if (recordsToCreate.length) {
        batchResults.push(
          this.importXlsxBatch({ registerId, keyId }, recordsToCreate, accessInfo).then((ids) => {
            loadedRecords.push(...ids);
          }),
        );
      }

      // Wait for all batch results.
      await Promise.all(batchResults);

      if (clearRecords && loadedRecords.length) {
        const result = await callRegisterLegacy(
          'register-request-delete-record-error',
          () => this.registerService.deleteBulkRecords({ registerId, keyId, skipRecordIds: loadedRecords }, { accessInfo }),
          'undefined',
        );

        getLog().save('register-import-xlsx-clear-records', result);
      }
    } catch (error) {
      getLog().save('register-import-xlsx-error', error);
      throw error;
    }

    return true;
  }

  /**
   * Import records by xlsx batch.
   * @private
   * @param {object} params Params.
   * @param {object[]} batch Batch.
   * @param {object} accessInfo Access info.
   * @returns {Promise<string[]>} Imported records IDs.
   */
  async importXlsxBatch({ registerId, keyId }, batch, accessInfo) {
    const { importedRecords } = await callRegisterLegacy(
      'register-request-post-record-error',
      () =>
        this.registerService.importBulkRecords(
          {
            registerId,
            keyId,
            background: false,
            isCalculateSearchStrings: true,
            isReturnCreatedRecords: true,
            records: batch.map((r) => ({ data: r })),
          },
          { accessInfo },
        ),
      'undefined',
    );

    getLog().save('register-import-xlsx-batch-imported', { batchSize: batch.length });

    return importedRecords.map((r) => r.id);
  }

  /**
   * Export records by xlsx.
   * @param {object} params Params.
   * @param {number} params.registerId Register ID.
   * @param {number} params.keyId Key ID.
   * @returns {Promise<object>}
   */
  async exportXlsx({ res, registerId, keyId }) {
    try {
      let data = [];
      const key = await callRegisterLegacy('register-request-get-keys-error', () => this.registerService.findKeyById(keyId), 'undefined');
      if (!key) {
        return;
      }

      const fields = Object.keys(_.get(key, 'schema.properties', {}));

      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', 'attachment; filename="register.xlsx"');

      let allRecords = [];
      const { data: records, meta } = await callRegisterLegacy(
        'register-request-get-records-error',
        () => this.registerService.getRecords({ register_id: registerId, key_id: keyId, allow_see_all_records: true }),
        'body',
      );
      allRecords = allRecords.concat(records);

      if (records) {
        const pages = Math.max(Math.ceil(meta.count / meta.limit), 1);
        for (let currentPage = 1; currentPage <= pages; currentPage++) {
          const offset = currentPage * meta.limit;
          const { data: records } = await callRegisterLegacy(
            'register-request-get-records-error',
            () => this.registerService.getRecords({ register_id: registerId, key_id: keyId, offset, allow_see_all_records: true }),
            'body',
          );
          allRecords = allRecords.concat(records);
          res.write('');
        }
      }

      if (allRecords.length > 0) {
        data.push(fields);

        for (const record of allRecords) {
          let row = [];
          for (const field of fields) {
            if (record.data[field]) {
              row.push(record.data[field]);
            } else {
              row.push('');
            }
          }
          data.push(row);
        }
      }

      // make object as string
      const dataFixedArray = data.map((a) => a.map((item) => (typeof item === 'object' ? `_JSON:${JSON.stringify(item)}` : item)));

      const buffer = xlsx.build([{ name: 'register', data: dataFixedArray } as any]);
      res.write(buffer);

      return res.end();
    } catch (error) {
      getLog().save('register-export-xlsx-error', error);
      throw error;
    }
  }

  /**
   * Reindex by key ID.
   * @param {number} keyId Key ID.
   * @returns {Promise<object>}
   */
  async reindexByKeyId(keyId) {
    const response = await callRegisterLegacy('register-request-post-keys-reindex-error', () => this.registerService.reindexKey(keyId), 'undefined');

    return response;
  }

  /**
   * After handlers reindex by key ID.
   * @param {number} keyId Key ID.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async afterHandlersReindexByKeyId(keyId, data) {
    const response = await callRegisterLegacy(
      'register-request-post-keys-afterhandlers-reindex-error',
      () => this.registerService.afterHandlersReindexKey(keyId, data),
      'undefined',
    );

    return response;
  }
}
