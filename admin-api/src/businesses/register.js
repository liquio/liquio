const _ = require('lodash');
const xlsx = require('node-xlsx');

const Exceptions = require('../exceptions');
const RegisterService = require('../services/register');

/**
 * Register business.
 */
class RegisterBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!RegisterBusiness.singleton) {
      this.config = config;
      this.registerService = new RegisterService();
      this.importXlsxBatchSize = global.config.register?.importXlsx?.batchSize || 256;
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
    const registers = await this.registerService.getRegisters({ id, key_id, name, offset, limit });

    return registers;
  }

  /**
   * Get registers.
   * @returns {Promise<object[]>}
   */
  async getRegisters() {
    let registers = await this.registerService.getRegisters({ offset: 0, limit: 1000 });

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
    const register = await this.registerService.findRegisterById(id);

    return register;
  }

  /**
   * Create register.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createRegister(data, accessInfo) {
    const register = await this.registerService.createRegister(data, accessInfo);

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
    const register = await this.registerService.updateRegisterById(id, data, accessInfo);

    return register;
  }

  /**
   * Delete register.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteRegisterById(id, accessInfo) {
    const register = await this.registerService.deleteRegisterById(id, accessInfo);

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
    const keys = await this.registerService.getKeys({ register_id, offset, limit });

    return keys;
  }

  /**
   * Get keys.
   * @param {object} params Params.
   * @param {number} params.register_id Register ID.
   * @returns {Promise<object[]>}
   */
  async getKeys({ register_id }) {
    let keys = await this.registerService.getKeys({ register_id, offset: 0, limit: 1000 });

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
    const key = await this.registerService.findKeyById(id);

    return key;
  }

  /**
   *
   * @param {number} keyId
   * @param {string} mapping
   * @returns
   */
  async updateIndexMapping(keyId, mapping) {
    return this.registerService.updateIndexMapping(keyId, mapping);
  }

  /**
   * get synced keys.
   * @param {number} ids IDs.
   * @returns {Promise<object>}
   */
  async getSyncedKeys(ids) {
    const keys = await this.registerService.getSyncedKeys(ids);

    return keys;
  }

  /**
   * get all synced keys.
   * @returns {Promise<object>}
   * @param {object} params Params.
   */
  async getAllSyncedKeys(params) {
    const keys = await this.registerService.getAllSyncedKeys(params);

    return keys;
  }

  /**
   * Create key.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createKey(data, accessInfo) {
    const key = await this.registerService.createKey(data, accessInfo);

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
    const key = await this.registerService.updateKeyById(id, data, accessInfo);

    return key;
  }

  /**
   * Delete key.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteKeyById(id, accessInfo) {
    const key = await this.registerService.deleteKeyById(id, accessInfo);

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
    const keys = await this.registerService.getRecords({ register_id, key_id, offset, limit });

    return keys;
  }

  /**
   * Find record by ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findRecordById(id) {
    const record = await this.registerService.findRecordById(id);

    return record;
  }

  /**
   * Create record.
   * @param {object} data Data.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async createRecord(data, accessInfo) {
    const record = await this.registerService.createRecord(data, accessInfo);

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
    const record = await this.registerService.importBulkRecords(params, records, accessInfo);

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
    const record = await this.registerService.updateRecordById(id, data, accessInfo);

    return record;
  }

  /**
   * Delete record.
   * @param {number} id ID.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async deleteRecordById(id, accessInfo) {
    const record = await this.registerService.deleteRecordById(id, {}, accessInfo);

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
      register = await this.registerService.export(id, params);
    } catch (error) {
      log.save('register-export-error', error);
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
      if (!file) {
        data = JSON.parse(data);
      }
      return await this.registerService.import({ force, rewriteSchema, clearRecords, addData, file }, data, accessInfo);
    } catch (error) {
      log.save('register-import-error', error);
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
      register = await this.registerService.export(id, { withData, file });
    } catch (error) {
      log.save('register-export-error', error);
      throw error;
    }

    return register;
  }

  /**
   * Stream import register.
   * @param {object} params Params.
   * @param {boolean} params.clearRecords Clear Records.
   * @param {object} accessInfo Access info.
   * @returns {Promise<object>}
   */
  async streamImport(clearRecords, accessInfo) {
    return this.registerService.streamImport(clearRecords, accessInfo);
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
      if (keyOrigin?.registerId !== registerId) throw new Error('keyId has no relations with registerId');

      const loadedRecords = [];

      const time = Date.now();
      const xlsxParsed = xlsx.parse(data);
      log.save('register-import-xlsx-parsed', { time: Date.now() - time, size: data.length, sheets: xlsxParsed.length });

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
            const { data: records } = await this.registerService.getRecords({
              key_id: keyId,
              [`data[${unique}]`]: item[unique],
              limit: 1,
            });
            if (records && records.length > 0) {
              const { id: recordId } = await this.registerService.updateRecordById(
                records[0].id,
                {
                  registerId,
                  keyId,
                  data: item,
                },
                accessInfo,
              );

              loadedRecords.push(recordId);
              log.save('register-import-xlsx-item-updated', item);
              continue;
            }
          }

          recordsToCreate.push(item);

          log.save('register-import-xlsx-item-saving', item);

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
        const result = await this.registerService.deleteBulkRecords({ registerId, keyId, skipRecordIds: loadedRecords }, accessInfo);

        log.save('register-import-xlsx-clear-records', result);
      }
    } catch (error) {
      log.save('register-import-xlsx-error', error);
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
    const { importedRecords } = await this.registerService.importBulkRecords(
      {
        registerId,
        keyId,
        background: false,
        isCalculateSearchStrings: true,
        isReturnCreatedRecords: true,
      },
      batch.map((r) => ({ data: r })),
      accessInfo,
    );

    log.save('register-import-xlsx-batch-imported', { batchSize: batch.length });

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
      const key = await this.registerService.findKeyById(keyId);
      if (!key) {
        return;
      }

      const fields = Object.keys(_.get(key, 'schema.properties', {}));

      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', 'attachment; filename="register.xlsx"');

      let allRecords = [];
      const { data: records, meta } = await this.registerService.getRecords({
        register_id: registerId,
        key_id: keyId,
      });
      allRecords = allRecords.concat(records);

      if (records) {
        const pages = Math.max(Math.ceil(meta.count / meta.limit), 1);
        for (let currentPage = 1; currentPage <= pages; currentPage++) {
          const offset = currentPage * meta.limit;
          const { data: records } = await this.registerService.getRecords({
            register_id: registerId,
            key_id: keyId,
            offset,
          });
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

      const buffer = xlsx.build([{ name: 'register', data: dataFixedArray }]);
      res.write(buffer);

      return res.end();
    } catch (error) {
      log.save('register-export-xlsx-error', error);
      throw error;
    }
  }

  /**
   * Reindex by key ID.
   * @param {number} keyId Key ID.
   * @returns {Promise<object>}
   */
  async reindexByKeyId(keyId) {
    const response = await this.registerService.reindexByKeyId(keyId);

    return response;
  }

  /**
   * After handlers reindex by key ID.
   * @param {number} keyId Key ID.
   * @param {object} data Data.
   * @returns {Promise<object>}
   */
  async afterHandlersReindexByKeyId(keyId, data) {
    const response = await this.registerService.afterHandlersReindexByKeyId(keyId, data);

    return response;
  }
}

module.exports = RegisterBusiness;
