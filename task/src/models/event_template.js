const Sequelize = require('sequelize');
const jsoncParser = require('jsonc-parser');

const Model = require('./model');
const EventTemplateEntity = require('../entities/event_template');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

class EventTemplateModel extends Model {
  constructor() {
    if (!EventTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'eventTemplate',
        {
          event_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'event_types', key: 'id' }
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          json_schema: Sequelize.TEXT,
          html_template: Sequelize.TEXT
        },
        {
          tableName: 'event_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      PgPubSub.getInstance().subscribe('event_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache.eventTemplate?.findById || DEFAULT_CACHE_TTL,
        findByIds: global.config.cache.eventTemplate?.findByIds || DEFAULT_CACHE_TTL
      };

      EventTemplateModel.singleton = this;
    }

    return EventTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<EventTemplateEntity>}
   */
  async findById(id) {
    const { data: eventTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('event_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById
    );

    return this.prepareEntity(eventTemplate);
  }

  /**
   * Find by IDs.
   * @param {number[]} ids
   * @returns {Promise<EventTemplateEntity[]>}
   */
  async findByIds(ids) {
    const { data: eventTemplates } = await RedisClient.getOrSet(
      RedisClient.createKey('event_template', 'findByIds', ids),
      () => this.model.findAll({ where: { id: ids } }),
      this.cacheTtl.findByIds
    );

    return eventTemplates.map(item => this.prepareEntity(item));
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {EventTemplateEntity}
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

    return new EventTemplateEntity({
      id: item.id,
      eventTypeId: item.event_type_id,
      name: item.name,
      description: item.description,
      jsonSchema: jsonSchema,
      htmlTemplate: item.html_template,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }

  /**
   * Prepare for model.
   * @param {EventTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      event_type_id: item.eventTypeId,
      name: item.name,
      description: item.description,
      json_schema: JSON.stringify(item.jsonSchema),
      html_template: item.htmlTemplate,
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
      redis.delete(RedisClient.createKey('event_template', 'findById', id));
      redis.deleteMany(RedisClient.createKey('event_template', 'findByIds', '*'));
    }
  }
}

module.exports = EventTemplateModel;
