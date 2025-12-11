import Log from '../log';
import { RedisClient } from '../redis_client';
import BlockchainAfterhandlerWorker from './workers/blockchain';
import ElasticAfterhandlerWorker from './workers/elastic';
import PLinkAfterhandlerWorker from './workers/plink';

// Constants.
const AFTERHANDLER_WORKERS_LIST = [BlockchainAfterhandlerWorker, ElasticAfterhandlerWorker, PLinkAfterhandlerWorker];
const REDIS_REINDEX_PREFIX = 'register:afterhandlerReindexing';
const REDIS_KEY_EXPIRATION = 60 * 60 * 24; // 1 day in seconds

/**
 * Afterhandler.
 * @typedef {import('./workers/worker')} AfterhandlerWorker
 * @typedef {import('../../models/afterhandler')} AfterhandlerModel
 * @typedef {import('../../models/record')} RecordModel
 */
export default class Afterhandler {
  static singleton: Afterhandler;
  log: Log;

  config: any;
  afterhandlerModel: any;
  recordModel: any;
  workers: any[];
  keyReindexing: Record<string, any>;

  /**
   *
   * @param {{blockchain, elastic}} config Config.
   * @param {AfterhandlerModel} afterhandlerModel Afterhandler model.
   * @param {RecordModel} recordModel Record model.
   */
  constructor(config, afterhandlerModel, recordModel) {
    // Singleton.
    if (!Afterhandler.singleton) {
      // Save params.
      this.log = Log.getInstance();
      this.config = config;
      this.afterhandlerModel = afterhandlerModel;
      this.recordModel = recordModel;
      this.keyReindexing = {};

      // Init singleton.
      Afterhandler.singleton = this;
    }

    // Return singleton.
    return Afterhandler.singleton;
  }

  /**
   * Workers classes.
   * @returns {AFTERHANDLER_WORKERS_LIST} Afterhandler workers classes.
   */
  static get WorkersClasses() {
    return AFTERHANDLER_WORKERS_LIST;
  }

  /**
   * Redis reindex prefix.
   * @returns {string} Redis key for afterhandler reindexing status.
   **/
  static get redisReindexPrefix() {
    return `${REDIS_REINDEX_PREFIX}`;
  }

  /**
   * Init.
   */
  init() {
    // Init workers.
    this.workers = Afterhandler.WorkersClasses.map((WorkerClass) =>
      this.config[WorkerClass.afterhandlerType] ? new WorkerClass(this.config[WorkerClass.afterhandlerType], this.afterhandlerModel) : null
    ).filter((v) => !!v);
    this.log.save(
      'afterhandler-workers-initialized',
      Afterhandler.WorkersClasses.map((WorkerClass) => WorkerClass.afterhandlerType)
    );

    // Start workers.
    this.workers.forEach((worker) => worker.start());
  }

  /**
   * Reindex.
   * @param {number} keyId Key ID.
   * @param {object} options Options.
   */
  async reindex(keyId, options: { types?: any[] } = {}): Promise<boolean> {
    await this.markKeyReindexStart(keyId);

    const workers = options.types ? this.workers.filter((worker) => options.types.includes(worker.afterhandlerType)) : this.workers;
    delete options.types;
    // Reindex - reset.
    for (const worker of workers) {
      await worker.reindexReset(keyId, options);
      const lastFterhandlerByKeyId = await this.afterhandlerModel.getLastByKeyId(keyId);
      if (lastFterhandlerByKeyId) {
        await this.afterhandlerModel.clearError(lastFterhandlerByKeyId.id);
      }
    }

    // Wait 5 seconds.
    await new Promise((resolve) => setTimeout(resolve, 5e3));

    await this.afterhandlerModel.setSyncedWithErrorByKeyid(keyId, 'Reindex started.');

    // Reindex - add.
    const { options: { reindexLimit: limit = 100 } = {} } = this.config;
    let needToCheckNextPaginationDataset = true;
    let offset = 0;
    while (needToCheckNextPaginationDataset) {
      const { data: records } = await this.recordModel.getByKeyIdWithPagination(keyId, offset, limit);
      for (const record of records) {
        for (const worker of workers) {
          try {
            await worker.reindexAdd(record);
          } catch (error) {
            this.log.save('afterhandler-reindex-error', { error: error.toString(), stack: error.stack });

            const lastFterhandlerByKeyId = await this.afterhandlerModel.getLastByKeyId(keyId);
            if (lastFterhandlerByKeyId) {
              await this.afterhandlerModel.setSyncedWithError(lastFterhandlerByKeyId.id, error.toString());
            }

            // Before exiting early, we need to mark the key reindexing as stopped.
            await this.markKeyReindexStop(keyId);

            return false;
          }
        }
      }
      needToCheckNextPaginationDataset = records.length > 0;
      offset += limit;
    }

    await this.markKeyReindexStop(keyId);

    return true;
  }

  /**
   * Validate record.
   * @param {object} record Record.
   * @param {string} operation Operation.
   * @throws {Error} Error.
   * @returns {Promise<void>} Promise.
   */
  async validateRecord(record, operation) {
    if (!record) {
      throw new Error('Record is not defined.');
    }
    if (!operation) {
      throw new Error('Operation is not defined.');
    }

    // Validate record.
    for (const worker of this.workers) {
      await worker.validateRecord(record, operation);
    }
  }

  /**
   * Retrieve key indexing status.
   * Use Redis to store state or fallback to in-memory storage.
   * @param {number} keyId Key ID.
   * @returns {Promise<boolean>} True if key reindexing is in progress.
   **/
  async isKeyReindexing(keyId) {
    if (global.config?.redis?.isEnabled) {
      return !!(await RedisClient.getInstance().get([Afterhandler.redisReindexPrefix, keyId]));
    } else {
      return !!this.keyReindexing[keyId];
    }
  }

  /**
   * Store the fact that the key reindexing has started.
   * Use Redis to store state or fallback to in-memory storage.
   * @param {number} keyId Key ID.
   * @returns {Promise<void>}
   */
  async markKeyReindexStart(keyId) {
    if (global.config?.redis?.isEnabled) {
      await RedisClient.getInstance().set([Afterhandler.redisReindexPrefix, keyId], 'started', REDIS_KEY_EXPIRATION);
    } else {
      this.keyReindexing[keyId] = true;
    }
  }

  /**
   * Store the fact that the key reindexing has stopped.
   * Use Redis to store state or fallback to in-memory storage.
   * @param {*} keyId
   * @returns {Promise<void>}
   */
  async markKeyReindexStop(keyId) {
    if (global.config?.redis?.isEnabled) {
      await RedisClient.getInstance().delete([Afterhandler.redisReindexPrefix, keyId]);
    } else {
      delete this.keyReindexing[keyId];
    }
  }
}
