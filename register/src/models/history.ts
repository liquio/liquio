import Sequelize, { Op } from 'sequelize';
import _ from 'lodash';

import Model from './model';
import HistoryEntity from '../entities/history';
import AfterhandlerEntity from '../entities/afterhandler';
import KeyModel from './key';
import AfterhandlerModel from './afterhandler';

const KEYMODEL_CACHE_TIME = 30;

/**
 * History model.
 */
export default class HistoryModel extends Model {
  private static singleton: HistoryModel;
  public keyModel: KeyModel;
  public afterhandlerModel: AfterhandlerModel;

  /**
   * Constructor.
   * @param {object} config Config.
   * @param {object} options Options.
   */
  constructor(config, options) {
    // Singleton.
    if (!HistoryModel.singleton) {
      // Call Parent constructor.
      super(config, options);

      this.keyModel = new KeyModel();

      // Init model.
      this.model = this.db.define(
        'history',
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
          register_id: {
            type: Sequelize.INTEGER,
            references: { model: 'registers', key: 'id' }
          },
          key_id: {
            type: Sequelize.INTEGER,
            references: { model: 'keys', key: 'id' }
          },
          operation: {
            allowNull: false,
            type: Sequelize.ENUM('create', 'update', 'delete')
          },
          data: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {}
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING
          },
          updated_by: {
            allowNull: false,
            type: Sequelize.STRING
          },
          person: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: { id: null, name: null }
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {}
          }
        },
        {
          tableName: 'history',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Init singleton.
      HistoryModel.singleton = this;
    }

    // Return singleton.
    return HistoryModel.singleton;
  }

  static getInstance() {
    return HistoryModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: HistoryEntity}>} History entity promise.
   */
  async findById(id): Promise<{ data: HistoryEntity }> {
    // DB query.
    const historyRaw = await this.model.findByPk(id);
    const historyEntity = new HistoryEntity(historyRaw);

    // Define and return model response.
    return { data: historyEntity };
  }

  /**
   * Get by key ID.
   * @param {number} keyId Key ID.
   * @param {{offset, limit, operation}} options Query options.
   * @returns {Promise<{data: HistoryEntity[]}>} History entities list promise.
   */
  async getByKeyId(keyId, options = {}) {
    // Check options.
    if (!keyId) {
      throw new Error('Key ID not defined.');
    }

    // Handle options.
    const { offset, limit, operation, recordDataLike } = { offset: 0, limit: 2, ...options } as any;
    const filter: any = {
      key_id: keyId
    };
    if (operation) {
      filter.operation = operation;
    }
    if (recordDataLike) filter.data = { data: this.createSearchQuery(recordDataLike) };
    // if (recordDataLike) filter.data = recordDataLike;
    const queryOptions = { order: [['created_at', 'desc']], where: filter, offset, limit };

    // DB query.
    const { count, rows: historyListRaw } = await this.model.findAndCountAll(queryOptions);
    const historyListEntities = historyListRaw.map((historyRaw) => new HistoryEntity(historyRaw));

    // Define and return model response.
    const modelResponse = { data: historyListEntities, meta: { count, offset, limit } };
    return modelResponse;
  }

  /**
   * Get by record ID.
   * @param {number} recordId Record ID.
   * @param {{offset, limit, operation}} options Query options.
   * @returns {Promise<{data: HistoryEntity[]}>} History entities list promise.
   */
  async getByRecordId(recordId, options = {}) {
    // Check options.
    if (!recordId) {
      throw new Error('Key ID not defined.');
    }

    // Handle options.
    const { offset, limit, operation, createdBefore } = { offset: 0, limit: 2, ...options } as any;
    const filter: any = { record_id: recordId };
    if (operation) {
      filter.operation = operation;
    }
    if (createdBefore) {
      filter.created_at = { [Op.lte]: new Date(createdBefore) };
    }
    const queryOptions = { order: [['created_at', 'desc']], where: filter, offset, limit };

    // DB query.
    const { count, rows: historyListRaw } = await this.model.findAndCountAll(queryOptions);
    const historyListEntities = historyListRaw.map((historyRaw) => new HistoryEntity(historyRaw));

    // Define and return model response.
    const modelResponse = { data: historyListEntities, meta: { count, offset, limit } };
    return modelResponse;
  }

  /**
   * Get ALL by key ID.
   * @param {number} keyId Key ID.
   * @param {{createdAfter}} options Query options.
   * @returns {Promise<{historyListEntities}>} History entities list promise.
   */
  async getAllHistoryRowsByKeyId(keyId, { createdAfter }) {
    if (!keyId) {
      throw new Error('Key ID not defined.');
    }
    if (!createdAfter) {
      throw new Error('CreatedAfter not defined.');
    }

    const filters = {
      key_id: keyId,
      created_at: {
        [Op.gt]: new Date(createdAfter)
      }
    };

    const LIMIT = 100000;

    const queryOptions = {
      order: [['created_at', 'desc']],
      where: filters,
      attributes: ['id', 'record_id', 'operation', 'created_at'],
      offset: 0,
      limit: LIMIT
    };
    let receivedRowsCount = 0;
    const result = [];
    let isGotAllNeededRows = false;

    while (!isGotAllNeededRows) {
      // DB query.
      const modelResponse = await this.model.findAndCountAll(queryOptions);
      receivedRowsCount = modelResponse.rows.length;
      const historyListEntities = modelResponse.rows.map((historyRaw) => new HistoryEntity(historyRaw));
      result.push(...historyListEntities);

      if (receivedRowsCount < LIMIT) {
        isGotAllNeededRows = true;
        break;
      }
      queryOptions.offset += receivedRowsCount;
    }

    return result;
  }

  /**
   * Create afterhandlers.
   * @private
   * @param {HistoryEntity} history History entity.
   * @param {string} user User ID.
   * @param {number} [keyId] Key ID.
   * @returns {Promise<AfterhandlerEntity[]>} Created afterhandler entities promise.
   */
  async createAfterhandlers(recordId, user, keyId) {
    let historyId;

    // Check afterhandler config.
    const afterhandlerConfig = global.config.afterhandler;

    // Handle all afterhandler types.
    const afterhandlerTypes = Object.values(AfterhandlerEntity.Types);
    const createdAfterhandlerEntities = [];
    for (const afterhandlerType of afterhandlerTypes) {
      // Check in config.
      const afterhandlerKeys = (afterhandlerConfig[afterhandlerType] && afterhandlerConfig[afterhandlerType].keys) || [];

      // Check in key meta.
      const { data } = await this.keyModel.findById(keyId, { cacheTime: KEYMODEL_CACHE_TIME });
      const keyAfterhandlers = (data?.meta as any)?.afterhandlers || [];

      // Skip if not in config or key meta.
      if (!afterhandlerKeys.includes(keyId) && !keyAfterhandlers.includes(afterhandlerType)) continue;

      if (!historyId) {
        // Get last (newest) history row.
        const { data: getByRecordIdData } = await this.getByRecordId(recordId);
        historyId = getByRecordIdData[0].id;
      }

      // Create afterhandler.
      const { data: createdAfterhandlerEntity } = await this.afterhandlerModel.create({ type: afterhandlerType, historyId, user });
      createdAfterhandlerEntities.push(createdAfterhandlerEntity);
    }
    return createdAfterhandlerEntities;
  }

  createSearchQuery(data) {
    const dataToSearch = typeof data === 'string' ? JSON.parse(data) : JSON.parse(JSON.stringify(data));
    for (const dataKey in dataToSearch) {
      let dataValue = dataToSearch[dataKey];
      const nestedPath = dataKey.split('.');
      switch (true) {
        // If string or number.
        case typeof dataValue === 'string' || typeof dataValue === 'number':
          dataValue = { [Sequelize.Op.iLike]: `%${dataValue}%` };
          _.set(dataToSearch, nestedPath, dataValue);
          if (nestedPath.length > 1) {
            delete dataToSearch[dataKey];
          }
          break;
        // If nested object.
        case typeof dataValue === 'object':
          dataToSearch[dataKey] = this.createSearchQuery(dataToSearch[dataKey]);
          break;
      }
    }

    return dataToSearch;
  }
}
