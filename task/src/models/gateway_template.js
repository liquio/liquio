const Sequelize = require('sequelize');
const jsoncParser = require('jsonc-parser');

const Model = require('./model');
const GatewayTemplateEntity = require('../entities/gateway_template');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

class GatewayTemplateModel extends Model {
  constructor() {
    if (!GatewayTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'gatewayTemplate',
        {
          gateway_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'gateway_types', key: 'id' }
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          json_schema: Sequelize.TEXT
        },
        {
          tableName: 'gateway_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      PgPubSub.getInstance().subscribe('gateway_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache.gatewayTemplate?.findById || DEFAULT_CACHE_TTL
      };

      GatewayTemplateModel.singleton = this;
    }

    return GatewayTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<GatewayTemplateEntity>}
   */
  async findById(id) {
    const { data: gatewayTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('gateway_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById
    );

    return this.prepareEntity(gatewayTemplate);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {GatewayTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    let jsonSchema;
    try {
      jsonSchema = jsoncParser.parse(item.json_schema);
    } catch {
      jsonSchema = {};
    }

    return new GatewayTemplateEntity({
      id: item.id,
      gatewayTypeId: item.gateway_type_id,
      name: item.name,
      description: item.description,
      jsonSchema: jsonSchema,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      gateway_type_id: item.gatewayTypeId,
      name: item.name,
      description: item.description,
      json_schema: JSON.stringify(item.jsonSchema),
      created_at: item.createdAt,
      updated_at: item.updatedAt
    };
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
  onRowChange(channel, { id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('gateway_template', 'findById', id));
    }
  }
}

module.exports = GatewayTemplateModel;
