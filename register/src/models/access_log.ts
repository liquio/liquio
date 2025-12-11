import Sequelize from 'sequelize';

import Model from './model';
import AccessLogEntity from '../entities/access_log';

/**
 * Access log model.
 */
export default class AccessLogModel extends Model {
  private static singleton: AccessLogModel;

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} options Options.
   */
  constructor(config: any, options: any) {
    if (!AccessLogModel.singleton) {
      super(config, options);

      this.model = this.db.define(
        'accessLog',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1
          },
          record_id: {
            allowNull: false,
            type: Sequelize.UUID
          },
          key_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'keys', key: 'id' }
          },
          data: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {}
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE
          }
        },
        {
          tableName: 'access_log',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );
      AccessLogModel.singleton = this;
    }

    return AccessLogModel.singleton;
  }

  static getInstance() {
    return AccessLogModel.singleton;
  }

  /**
   * Get all.
   * @param {object} [options] Options.
   * @param {object} [options.filter] Filter. Sample: { record_id: 'aaa-bbb-ccc' }.
   * @param {object} [options.offset] Offset. Sample: 0.
   * @param {object} [options.limit] Limit. Sample: 20.
   * @returns {Promise<{data: AccessLogEntity[], meta: {count, offset, limit}}>} Access log promise.
   */
  async getAll(options: any = {}) {
    // Handle options.
    const { filter, offset, limit } = { offset: 0, limit: 2, filter: {}, ...options };

    if (filter.created_from || filter.created_to) {
      filter.created_at = {};
    }
    if (filter.created_from) {
      if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(filter.created_from)) {
        filter.created_at[Sequelize.Op.gte] = new Date(`${filter.created_from} 00:00:00.000`).toJSON();
      } else {
        filter.created_at[Sequelize.Op.gte] = filter.created_from;
      }
      delete filter.created_from;
    }
    if (filter.created_to) {
      if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(filter.created_to)) {
        filter.created_at[Sequelize.Op.lte] = new Date(`${filter.created_to} 23:59:59.999`).toJSON();
      } else {
        filter.created_at[Sequelize.Op.lte] = filter.created_to;
      }
      delete filter.created_to;
    }

    const queryOptions = { order: [['created_at', 'desc']], where: filter, offset, limit };

    // DB query.
    const { count, rows: accessLogRaw } = await this.model.findAndCountAll(queryOptions);
    const accessLogEntities = accessLogRaw.map((accessLogRaw) => new AccessLogEntity(accessLogRaw));

    // Define and return model response.
    const modelResponse = { data: accessLogEntities, meta: { count, offset, limit } };
    return modelResponse;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: AccessLogEntity}>} Key promise.
   */
  async findById(id) {
    // DB query.
    const accessLogRaw = await this.model.findByPk(id);
    if (!accessLogRaw) {
      return;
    }
    const accessLogEntity = new AccessLogEntity(accessLogRaw);

    // Define and return model response.
    const modelResponse = { data: accessLogEntity };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.recordId Record ID.
   * @param {number} data.keyId Key ID.
   * @param {object} data.data Data.
   */
  async create({ recordId, keyId, data }) {
    // Prepare RAW.
    const accessLogToCreateRaw = {
      record_id: recordId,
      key_id: keyId,
      data: data
    };

    // DB query.
    const createdAccessLogRaw = await this.model.create(accessLogToCreateRaw);
    const createdAccessLogEntity = new AccessLogEntity(createdAccessLogRaw);

    // Define and return model response.
    const modelResponse = { data: createdAccessLogEntity };
    return modelResponse;
  }

  /**
   * Bulk create.
   * @param {{recordId, keyId, data}[]} list List.
   */
  async bulkCreate(list) {
    // Prepare RAW.
    const accessLogsToCreateRaw = list.map((v) => ({
      record_id: v.recordId,
      key_id: v.keyId,
      data: v.data
    }));

    // DB query.
    const createdAccessLogsRaw = await this.model.bulkCreate(accessLogsToCreateRaw);
    const createdAccessLogsEntity = new AccessLogEntity(createdAccessLogsRaw);

    // Define and return model response.
    const modelResponse = { data: createdAccessLogsEntity };
    return modelResponse;
  }
}
