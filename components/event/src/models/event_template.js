const Sequelize = require('sequelize');

const Model = require('./model');
const EventTemplateEntity = require('../entities/event_template');
const RedisClient = require('../lib/redis_client');

const FIND_BY_ID_CACHE_TTL = 60; // 1 minute.

class EventTemplateModel extends Model {
  constructor() {
    if (!EventTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'eventTemplate',
        {
          event_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'event_types', key: 'id' },
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          json_schema: Sequelize.TEXT,
          html_template: Sequelize.TEXT,
        },
        {
          tableName: 'event_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.cacheTtl = {
        findByIdCached: global.config.cache?.eventTemplate?.findByIdCached || 60, // 1 minute
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
    const eventTemplate = await this.model.findByPk(id);

    return this.prepareEntity(eventTemplate);
  }

  /**
   * Find by ID cached.
   * @param {number} id
   * @returns {Promise<EventTemplateEntity>}
   */
  async findByIdCached(id) {
    const { data } = await RedisClient.getOrSet(
      RedisClient.createKey(this.model.name, 'findById', id),
      () => this.findById(id),
      this.cacheTtl.findByIdCached,
    );
    return data;
  }

  /**
   * Find ID and name by ID.
   * @param {number} id ID.
   * @returns {Promise<{id: number, name: string}>} Event template data.
   */
  async findIdAndNameById(id) {
    const eventTemplate = await this.model.findByPk(id, { attributes: ['id', 'name'] });

    return this.prepareEntity(eventTemplate);
  }

  /**
   * Find ID and name by ID cached.
   * @param {number} id ID.
   * @returns {Promise<{id: number, name: string}>} Event template data.
   */
  async findIdAndNameByIdCached(id) {
    const { data } = await RedisClient.getOrSet(
      `event.${EventTemplateModel.name}.${id}.findIdAndNameById`,
      () => this.findIdAndNameById(id),
      FIND_BY_ID_CACHE_TTL,
    );
    return data;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {EventTemplateEntity}
   */
  prepareEntity(item) {
    return new EventTemplateEntity({
      id: item.id,
      eventTypeId: item.event_type_id,
      name: item.name,
      description: item.description,
      jsonSchema: item.json_schema,
      htmlTemplate: item.html_template,
    });
  }

  /**
   * Prepare for model.
   * @param {EventTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      event_type_id: item.eventTypeId,
      name: item.name,
      description: item.description,
      json_schema: item.jsonSchema,
      html_template: item.htmlTemplate,
    };
  }
}

module.exports = EventTemplateModel;
