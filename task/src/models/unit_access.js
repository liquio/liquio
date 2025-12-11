const Sequelize = require('sequelize');
const Model = require('./model');
const UnitAccessEntity = require('../entities/unit_access');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');
const { getArrayDifference } = require('../lib/utils');

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

/**
 * Unit access model.
 * @typedef {import('../entities/document')} DocumentEntity
 */
class UnitAccessModel extends Model {
  constructor() {
    if (!UnitAccessModel.singleton) {
      super();

      this.model = this.db.define(
        'unitAccess',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER
          },
          unit_id: {
            allowNull: true,
            type: Sequelize.INTEGER,
            references: { model: 'units', key: 'id' }
          },
          type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['register']
          },
          data: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {}
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {}
          }
        },
        {
          tableName: 'unit_access',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.paginate = this.paginate;
      this.model.prototype.prepareEntity = this.prepareEntity;

      PgPubSub.getInstance().subscribe('unit_access_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        getAllWithCache: global.config.cache.unitAccess?.getAllWithCache || DEFAULT_CACHE_TTL
      };

      UnitAccessModel.singleton = this;
    }

    return UnitAccessModel.singleton;
  }

  /**
   * Get all by unit ID and type.
   * @param {object} filter Filter. Sample: `{ unit_id: 1, type: 'register' }`.
   * @returns {Promise<UnitAccessEntity[]>} Unit access list promise.
   */
  async getAll(filter = {}) {
    const where = filter;
    const unitAccesssRaw = await this.model.findAll({ where });

    const unitAccesss = unitAccesssRaw.map(this.prepareEntity);
    return unitAccesss;
  }

  /**
   * Get all with cache.
   * @returns {Promise<UnitAccessEntity[]>} Unit access list promise.
   */
  async getAllWithCache() {
    const { data: unitAccesssRaw } = await RedisClient.getOrSet(
      RedisClient.createKey('unitAccess', 'getAllWithCache'),
      () => this.model.findAll(),
      this.cacheTtl.getAllWithCache
    );

    return unitAccesssRaw.map(this.prepareEntity);
  }

  /**
   * Find by ID.
   * @param {number} id Unit access ID.
   * @returns {Promise<UnitAccessEntity>} Unit access promise.
   */
  async findById(id) {
    const unitAccessRaw = await this.model.findByPk(id);

    if (!unitAccessRaw) { return; }
    const unitAccess = this.prepareEntity(unitAccessRaw);
    return unitAccess;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} [data.unitId] Unit ID.
   * @param {string} [data.type] Unit access type.
   * @param {object} [data.data] Data.
   * @returns {Promise<UnitAccessEntity>} Created unit access entity promise.
   */
  async create({ unitId, type, data = {} }) {
    const unitKeys = data?.keys
      ? Object.keys(data.keys)
        .flatMap((permision) => data.keys[permision])
        .filter(Boolean)
      : [];

    const keys = data?.strictAccess?.keys || unitKeys;

    // Set updatedAt to current timestamp for each key on creation.
    const meta = keys.reduce((acc, key) => {
      acc[key] = {
        updatedAt: new Date()
      };
      return acc;
    }, {});

    const unitAccessRaw = { unit_id: unitId, type, data, meta };
    const createdUnitAccessRaw = await this.model.create(unitAccessRaw);

    const createdUnitAccess = this.prepareEntity(createdUnitAccessRaw);
    return createdUnitAccess;
  }

  /**
   * Update.
   * @param {number} id Unit access ID.
   * @param {object} data Data object.
   * @param {number} [data.unitId] Unit ID.
   * @param {string} [data.type] Unit access type.
   * @param {object} [data.data] Data.
   * @returns {Promise<UnitAccessEntity>} Updated unit access entity promise.
   */
  async update(id, { unitId, type, data = {} }) {
    const existingUnitAccess = await this.findById(id);

    const keysWithChangedAccess = this.getKeysWithChangedAccess(existingUnitAccess, data);
    const keysWithChangedStrictAccess = this.getKeysWithChangedStrictAccess(existingUnitAccess, data);
    const uniqueModifiedAccessKeys = [...new Set([...keysWithChangedAccess, ...keysWithChangedStrictAccess])];

    const keyMetadataWithUpdatedTimestamps = uniqueModifiedAccessKeys?.reduce((metadataMap, accessKey) => {
      const existingKeyMetadata = metadataMap.get(accessKey) || {};
      metadataMap.set(accessKey, {
        ...existingKeyMetadata,
        updatedAt: new Date()
      });
      return metadataMap;
    }, new Map(Object.entries(existingUnitAccess.meta)));

    const updatedMetadata = Object.fromEntries(keyMetadataWithUpdatedTimestamps);

    const unitAccessRaw = { unit_id: unitId, type, data, meta: updatedMetadata };
    const where = { id: id };
    const [, updatedUnitAccessListRaw] = await this.model.update(unitAccessRaw, { where, returning: true });

    const [updatedUnitAccessRaw] = updatedUnitAccessListRaw;
    const updatedUnitAccess = this.prepareEntity(updatedUnitAccessRaw);
    return updatedUnitAccess;
  }

  /**
   * Delete by ID.
   * @param {number} id Unit access ID.
   * @returns {Promise<number>} Deleted unit acces count promise.
   */
  async deleteById(id) {
    const where = { id: id };
    const deletedUnitAccessCount = await this.model.destroy({ where });

    return deletedUnitAccessCount;
  }

  getKeysWithChangedAccess(existingUnitAccess, updatedUnitAccess) {
    const unitKeys = existingUnitAccess?.data?.keys || {};

    // hideKey, allowHead, allowRead, allowCreate, allowUpdate, allowDelete, allowHistory
    const permisions = Object.keys(unitKeys);
    
    // Get all keys, for which access was changed.
    const keysWithChangedAccess = permisions.flatMap((permision) => {
      const existingKeys = existingUnitAccess?.data?.keys?.[permision] || [];
      const updatedKeys = updatedUnitAccess?.keys?.[permision] || [];

      if (existingKeys.length === updatedKeys.length) {
        return [];
      }

      const keysWithChangedAccess = getArrayDifference(existingKeys, updatedKeys);
      return keysWithChangedAccess;
    });

    return keysWithChangedAccess;
  }

  getKeysWithChangedStrictAccess(existingUnitAccess, updatedUnitAccess) {
    const oldStrictAccessKeys = existingUnitAccess?.data?.strictAccess?.keys || [];
    const newStrictAccessKeys = updatedUnitAccess?.strictAccess?.keys || [];

    if (oldStrictAccessKeys.length === newStrictAccessKeys.length) {
      return [];
    }

    const keysWithChangedStrictAccess = getArrayDifference(oldStrictAccessKeys, newStrictAccessKeys);
    return keysWithChangedStrictAccess;
  }

  /**
   * Prepare entity.
   * @param {object} item Unit access RAW item.
   * @returns {UnitAccessEntity} Unit access entity.
   */
  prepareEntity(item) {
    return new UnitAccessEntity({
      id: item.id,
      unitId: item.unit_id,
      type: item.type,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      meta: item.meta
    });
  }

  /**
   * Invalidate cache on row change.
   * @private
   * @param {string} channel Channel.
   * @param {NotifyData} data Data.
   *
   * @typedef {Object} NotifyData
   * @property {number} id Row ID.
   * @property {'INSERT' | 'UPDATE' | 'DELETE'} action Action.
   * @property {string} table Table name.
   */
  onRowChange(_channel, { id: _id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('unitAccess', 'getAllWithCache'));
    }
  }
}

module.exports = UnitAccessModel;
