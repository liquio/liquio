import _ from 'lodash';
import { matchedData } from 'express-validator';

import { Request, Response } from '../router';
import Controller from './controller';
import KeyModel from '../models/key';
import RecordsModel from '../models/record';
import HistoryModel from '../models/history';
import ElasticAfterhandlerWorker from '../lib/afterhandler/workers/elastic';
import JobQueue from '../lib/job_queue';
import KeyEntity from '../entities/key';
import { ModelUpdateResponse } from '../lib/interfaces';
import Isolation from '../lib/isolation';

const REINDEX_CHUNK_SIZE = 10;

/**
 * Keys controller.
 */
export default class KeysController extends Controller {
  static singleton: KeysController;

  keyModel: KeyModel;
  recordsModel: RecordsModel;
  historyModel: HistoryModel;
  reindexing: { [keyId: number]: boolean };
  encryption_job_queue: JobQueue;

  /**
   * Keys controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!KeysController.singleton) {
      super(config);
      this.keyModel = KeyModel.getInstance();
      this.recordsModel = RecordsModel.getInstance();
      this.historyModel = HistoryModel.getInstance();

      this.reindexing = {};
      this.setupEncryptionJobQueue();

      KeysController.singleton = this;
    }
    return KeysController.singleton;
  }

  /**
   * Get all.
   */
  async getAll(req: Request, res: Response) {
    // Define params.
    const {
      offset,
      limit,
      register_id: registerId,
      parent_id: parentId
    } = {
      offset: 0,
      limit: 100,
      ...matchedData(req, { locations: ['query'] })
    } as any;
    const filter: { register_id?: number; parent_id?: number } = {};
    if (registerId) filter.register_id = registerId;
    if (parentId) filter.parent_id = parentId;

    // Get keys.
    let keysModelResponse;
    try {
      keysModelResponse = await this.keyModel.getAll({
        offset: offset,
        limit: Math.min(limit, this.config.pagination.maxLimit),
        filter
      });
    } catch (error) {
      this.log.save('get-keys-error', { error: error && error.message });
    }
    const { data: keys, meta } = keysModelResponse || {};

    // Backwards compatibility: remove after migration in bpmn-admin
    keys.forEach((key) => {
      key.lock = key?.accessMode === 'read_only';
    });

    // Response.
    this.responseData(res, keys, meta);
  }

  /**
   * Find by ID.
   */
  async findById(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });

    // Get key.
    let keyModelResponse;
    try {
      keyModelResponse = await this.keyModel.findById(id);
    } catch (error) {
      this.log.save('get-key-by-id-error', { error: error && error.message });
    }
    const { data: key } = keyModelResponse || {};

    // Check.
    if (!key) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Backwards compatibility: remove after migration in bpmn-admin
    key.lock = key?.accessMode === 'read_only';

    // Response.
    this.responseData(res, key);
  }

  /**
   * Find history by key ID.
   */
  async findHistoryByKeyId(req: Request, res: Response) {
    // Define params.
    const { id: keyId } = matchedData(req, { locations: ['params'] });
    const {
      offset,
      limit,
      operation,
      record_data_like: recordDataLike
    } = { offset: 0, limit: 20, ...matchedData(req, { locations: ['query'] }) } as any;

    if (!(await this.keyModel.checkRecordsReadableById(keyId))) {
      return this.responseError(res, 'Key records are not readable', 403);
    }

    // Get history.
    let historyModelResponse;
    try {
      historyModelResponse = await this.historyModel.getByKeyId(keyId, { offset, limit, operation, recordDataLike });
    } catch (error) {
      this.log.save('get-history-by-key-id-error', { error: error && error.message });
    }
    const { data: historyList, meta } = historyModelResponse || {};

    // Check.
    if (!historyList) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseData(res, historyList, meta);
  }

  /**
   * Create.
   */
  async create(req: Request, res: Response) {
    // Define params.
    const { registerId, name, description, schema, parentId, meta, toString, toSearchString, lock, accessMode, toExport, isEncrypted } = matchedData(
      req,
      { locations: ['body'] }
    ) as any;
    const { user } = req.auth;

    // Get keys.
    let keyModelResponse;
    try {
      keyModelResponse = await this.keyModel.create({
        registerId,
        name,
        description,
        schema,
        parentId,
        meta,
        toString,
        toSearchString,
        user,
        lock,
        // Backwards compatibility: simplify after migration in bpmn-admin
        accessMode: !accessMode && lock ? 'read_only' : accessMode || 'full',
        toExport,
        isEncrypted
      });
    } catch (error) {
      this.log.save('create-key-error', { error: error && error.message });
      return this.responseError(res, 'Create key error.', 400, error.message);
    }
    const { data: key } = keyModelResponse || {};

    // Check.
    if (!key) {
      return this.responseError(res, 'Can not create.', 500);
    }

    // Response.
    this.responseData(res, key);
  }

  /**
   * Update.
   */
  async update(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });
    const { registerId, name, description, schema, parentId, meta, toString, toSearchString, lock, accessMode, toExport, isEncrypted } = matchedData(
      req,
      { locations: ['body'] }
    ) as any;
    const { user } = req.auth;

    const oldKeyModelResponse = await this.keyModel.findById(id);
    if (!oldKeyModelResponse) {
      return this.responseError(res, 'Key not found.', 404);
    }
    if (isEncrypted !== undefined && isEncrypted !== oldKeyModelResponse.data.isEncrypted) {
      const recordsCount = await this.recordsModel.countAll({ filter: { key_id: id } });
      if (recordsCount > 0) {
        return this.responseError(res, "Can't change encryption status for a key with existing records.", 400);
      }
    }

    // Get keys.
    let keyModelResponse: ModelUpdateResponse<KeyEntity>;
    try {
      keyModelResponse = await this.keyModel.update(id, {
        registerId,
        name,
        description,
        schema,
        parentId,
        meta,
        toString: typeof toString === 'function' ? undefined : toString,
        toSearchString,
        user,
        lock,
        // Backwards compatibility: simplify after migration in bpmn-admin
        accessMode: !accessMode && lock ? 'read_only' : accessMode || 'full',
        toExport,
        isEncrypted
      });
    } catch (error) {
      this.log.save('update-key-error', { error: error.message, toString: toString.toString() });
    }
    const { data: key } = keyModelResponse || {};

    const [oldAfterhandlers, newAfterhandlers] = [oldKeyModelResponse.data.meta?.afterhandlers, meta?.afterhandlers].map((meta) =>
      [].concat(meta).filter(Boolean).sort()
    );

    if (!_.isEqual(oldAfterhandlers, newAfterhandlers)) {
      const addedAfterhandlers = newAfterhandlers.filter((afterhandler) => !oldAfterhandlers.includes(afterhandler));
      global.afterhandler.reindex(id, { types: addedAfterhandlers });
    }

    // Check.
    if (!key) {
      return this.responseError(res, 'Can not update.', 500);
    }

    // Schedule encryption job in the background
    this.addEncryptionJob(key.id);

    // Response.
    this.responseData(res, key);
  }

  /**
   * Delete.
   */
  async delete(req: Request, res: Response) {
    // Define params.
    const { id } = matchedData(req, { locations: ['params'] });

    // Delete key.
    let deletedRowsCountModelResponse;
    try {
      deletedRowsCountModelResponse = await this.keyModel.delete(id);
    } catch (error) {
      this.log.save('delete-key-error', { error: error && error.message });
    }
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};

    // Check.
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Can not delete.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }

  /**
   * Reindex.
   */
  async reindex(req: Request, res: Response) {
    // Define params.
    const { id: keyId } = matchedData(req, { locations: ['params'] });
    const { user } = req.auth;

    // Get key.
    let keyModelResponse;
    try {
      keyModelResponse = await this.keyModel.findById(keyId);
    } catch (error) {
      this.log.save('get-key-by-id-error', { error: error && error.message });
    }
    const { data: key } = keyModelResponse || {};

    // Check key.
    if (!key) {
      return this.responseError(res, 'Key not found.', 404);
    }

    // Get to search string function.
    const toSearchString = key.toSearchString;
    let toSearchStringFunction;
    try {
      const isolate = new Isolation();
      toSearchStringFunction = isolate.eval(`(${toSearchString})`);
    } catch (error) {
      this.log.save('define-to-search-string-function-error', { error: error && error.message });
      return this.responseError(res, 'Can not define search string function.', 500, error && error.message);
    }

    const updateRecords = async (offset) => {
      // Get records.
      let recordsModelResponse;
      try {
        recordsModelResponse = await this.recordsModel.getByKeyId(keyId, false, {
          order: [['id', 'ASC']],
          offset,
          limit: REINDEX_CHUNK_SIZE
        });
      } catch (error) {
        this.log.save('get-records-by-key-id-error', { error: error && error.message });
      }
      const { data: records } = recordsModelResponse || {};

      // Check key.
      if (!records) {
        return offset;
      }

      // Handle records using toSearchStringFunction.
      for (const record of records) {
        const { id, data } = record;
        try {
          const searchStrings = toSearchStringFunction(record);
          let searchString;
          let searchString2;
          let searchString3;
          if (Array.isArray(searchStrings)) {
            searchString = searchStrings[0];
            searchString2 = searchStrings[1];
            searchString3 = searchStrings[2];
          } else {
            searchString = searchStrings;
          }
          await this.recordsModel.update(id, { searchString, searchString2, searchString3, user, keyId, data }, undefined, undefined, true);
        } catch (error) {
          this.log.save('update-search-string-error', { error: error && error.message, record, toSearchString });
        }
      }

      if (records.length === REINDEX_CHUNK_SIZE) {
        return await updateRecords(offset + REINDEX_CHUNK_SIZE);
      }

      return offset + records.length;
    };

    if (this.reindexing[keyId]) {
      return this.responseError(res, 'Reindexing already in progress.', 500);
    }

    // Update records.
    const result = await Promise.race([
      (async () => {
        this.reindexing[keyId] = true;
        const recordsToUpdate = await updateRecords(0);
        this.reindexing[keyId] = false;
        return { recordsToUpdate };
      })(),
      new Promise((resolve) => setTimeout(() => resolve({ message: 'Reindex started.' }), 1000))
    ]);
    // Metric.
    this.responseData(res, result);
  }

  /**
   * Afterhandlers reindex.
   */
  async afterhandlersReindex(req: Request, res: Response) {
    // Define params.
    const { id: keyId } = matchedData(req, { locations: ['params'] });
    const options = matchedData(req, { locations: ['body'] });

    // Get key.
    let keyModelResponse;
    try {
      keyModelResponse = await this.keyModel.findById(keyId);
    } catch (error) {
      this.log.save('get-key-by-id-error', { error: error && error.message });
    }
    const { data: key } = keyModelResponse || {};

    // Check key.
    if (!key) {
      return this.responseError(res, 'Key not found.', 404);
    }

    // Response 202 and continue handling.
    this.responseData(res, { keyToReindex: key }, undefined, 202);

    // Afterhandlers reindex.
    await global.afterhandler.reindex(keyId, options);
  }

  /**
   * Find by ID.
   */
  async syncedByIds(req: Request, res: Response) {
    // Define params.
    const { ids: idsString } = matchedData(req, { locations: ['query'] });
    const ids = idsString
      .split(',')
      .map((item) => +item)
      .filter(Boolean);

    if (!ids.length) {
      return this.responseError(res, 'ids is empty', 403);
    }

    // Get key.
    let syncedResponse;
    try {
      syncedResponse = await this.keyModel.findSynced(ids).then((data: any) => data.filter(Boolean));
    } catch (error) {
      this.log.save('get-synced-by-ids-error', { error: error && error.message });
    }

    const elasticWorker = global.afterhandler.workers.find((worker) => worker instanceof ElasticAfterhandlerWorker);

    for (const result of syncedResponse) {
      const { key_id: keyId, total, queue_length: queueLength, is_elastic_active: isElasticActive } = result;
      try {
        if (!isElasticActive) {
          result.elasticStatus = 'inactive';
          continue;
        }

        const { count = 0, error } = await elasticWorker.getIndexCount(keyId);

        result.elastic = count;
        result.isReindexing = await global.afterhandler.isKeyReindexing(keyId);

        if (error) {
          if (error.type === 'index_not_found_exception') {
            result.elasticStatus = 'in_progress';
            result.status_message = null;
          } else {
            result.elasticStatus = 'error';
            result.status_message = error?.reason || error?.message || error;
          }
        } else if (result.isReindexing || Number(queueLength) > 0) {
          // Elastic status is considered "In Progress" if the afterhandler is still reindexing or there are items in the sync queue.
          result.elasticStatus = 'in_progress';
          result.status_message = null;
        } else if (!result.isReindexing && Number(total) === result.elastic && Number(queueLength) === 0) {
          // If afterhandler has finished reindexing, Elastic reports the number of records equal to the total number of records in the key,
          // and the sync queue is empty, then the Elastic status is considered "Synced".
          result.elasticStatus = 'synced';
          result.status_message = null;
        } else {
          // If we're stuck in another state, we consider it an error.
          result.elasticStatus = 'error';
        }
      } catch (error) {
        // If we can't get the status from Elastic, we consider it unknown.
        result.elasticStatus = 'unknown';
        this.log.save('get-elastic-count-error', { error: error && error.message });
      }
    }

    // Response.
    this.responseData(res, syncedResponse);
  }

  /**
   * All synced.
   */
  async allSynced(req: Request, res: Response) {
    // Get key.
    let syncedResponse;
    try {
      syncedResponse = await this.keyModel.allSynced();
    } catch (error) {
      this.log.save('get-all-synced-error', { error: error && error.message });
    }

    const elasticWorker = global.afterhandler.workers.find((worker) => worker instanceof ElasticAfterhandlerWorker);

    if (elasticWorker?.config?.isActive) {
      for (const result of syncedResponse) {
        const { key_id: keyId } = result;
        try {
          const { count = 0, error } = await elasticWorker.getIndexCount(keyId);
          result.elastic = count;

          if (error) {
            throw new Error(error.reason || error.message || error);
          }
        } catch (error) {
          this.log.save('get-elastic-count-error', { error: error && error.message });
        }
      }
    }

    // Response.
    this.responseData(res, syncedResponse);
  }

  async processEncryption(req: Request, res: Response) {
    // Define params.
    const { id: keyId } = matchedData(req, { locations: ['params'] });
    const options = matchedData(req, { locations: ['body'] });

    let count = 0;

    // Get key.
    let keyModelResponse;
    try {
      keyModelResponse = await this.keyModel.findById(keyId);
    } catch (error) {
      this.log.save('process-encryption-key-id-error', { error: error && error.message });
    }
    const { data: key } = keyModelResponse || {};

    // Check.
    if (!key) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Encrypt/decrypt next batch of records
    try {
      const isEncrypted = keyModelResponse.data.isEncrypted;
      count = await this.recordsModel.batchEncrypt(keyId, isEncrypted, options.limit);
      this.log.save('process-encryption', { keyId, count, isEncrypted });
    } catch (error) {
      this.log.save('process-encryption-error', { error: error && error.message });
    }

    // Response.
    this.responseData(res, { count });
  }

  /**
   * Setup encryption job queue.
   */
  private async setupEncryptionJobQueue() {
    this.encryption_job_queue = new JobQueue({
      onJobFailure: async (error) => {
        this.log.save('encryption-job-error', { error: error && error.message });
      }
    });

    if (this.config.encryption?.check_on_startup) {
      const keys = await this.keyModel.findUnfinishedEncryption();
      for (const key of keys) {
        this.encryption_job_queue.addJob(() => this.performEncryptionJob(key.id));
      }
    }
  }

  /**
   * Add encryption job.
   **/
  private addEncryptionJob(keyId: number) {
    this.encryption_job_queue.addJob(() => this.performEncryptionJob(keyId));
  }

  /**
   * Perform encryption job.
   */
  private async performEncryptionJob(keyId: number) {
    const key = await this.keyModel.findById(keyId);
    if (!key) {
      return;
    }

    const batchSize = this.config.encryption.batch_job_size;
    const isEncrypted = key.data.isEncrypted;
    const count = await this.recordsModel.batchEncrypt(keyId, isEncrypted, batchSize);

    // Add job to the queue if there are more records to process
    if (count >= batchSize) {
      this.encryption_job_queue.addJob(() => this.performEncryptionJob(keyId));
    }

    this.log.save('encryption-job', { keyId, count, isEncrypted });
  }
}
