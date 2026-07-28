import Business from './business';
import AccessLogModel from '../models/access_log';
import KeyModel from '../models/key';
import { RedisClient } from '../lib/redis_client';

/**
 * Access log business.
 * @typedef {import('../entities/record')} RecordEntity Record entity.
 */
export default class AccessLogBusiness extends Business {
  static singleton: AccessLogBusiness;

  keyIdsToSaveAccessLogFromConfig: number[];
  keyIdsToSaveAccessLog: number[];
  accessLogModel: AccessLogModel;
  keyModel: KeyModel;
  ttl: number;

  /**
   * RegisterBusiness constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AccessLogBusiness.singleton) {
      super(config);
      this.keyIdsToSaveAccessLogFromConfig = config.access_log.keyIds || [];
      this.keyIdsToSaveAccessLog = [];
      this.accessLogModel = AccessLogModel.getInstance();
      this.keyModel = KeyModel.getInstance();
      this.ttl = config.access_log.ttl || 60;
      AccessLogBusiness.singleton = this;
    }
    return AccessLogBusiness.singleton;
  }

  /**
   * Save if need it.
   * @param {RecordEntity[]} records Record entities.
   * @param {object} data Access log data to save.
   */
  async saveIfNeedIt(records, data) {
    // Check.
    if (!Array.isArray(records)) {
      return;
    }
    if (typeof data !== 'object' || data === null) {
      return;
    }

    await this.updateKeyIdsToSaveAccessLog();
    // Define records to save.
    const recordsToSave = records
      .filter((v) => this.keyIdsToSaveAccessLog.includes(v.keyId))
      .map((v) => ({
        recordId: v.id,
        keyId: v.keyId,
        data
      }));

    // Save to access log.
    this.accessLogModel.bulkCreate(recordsToSave);
  }

  async updateKeyIdsToSaveAccessLog() {
    const options = {
      filters: { isSaveViewingHistory: true },
      attributes: ['id']
    };
    const { data: keyIds } = await RedisClient.getOrSet(
      ['accessLog', 'keyIdsToSave'],
      async () => [...(await this.keyModel.findByMetaFilters(options)).map((el) => el.id), ...this.keyIdsToSaveAccessLogFromConfig],
      this.ttl
    );
    this.keyIdsToSaveAccessLog = keyIds;
  }
}
