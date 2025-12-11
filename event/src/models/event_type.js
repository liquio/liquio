const Sequelize = require('sequelize');

const Model = require('./model');
const EventTypeEntity = require('../entities/event_type');

class EventTypeModel extends Model {
  constructor() {
    if (!EventTypeModel.singleton) {
      super();

      this.model = this.db.define(
        'eventType',
        { name: { type: Sequelize.ENUM, values: ['notification', 'delay', 'request', 'stop', 'unit', 'user'] } },
        {
          tableName: 'event_types',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.cache = new Map();

      EventTypeModel.singleton = this;
    }

    return EventTypeModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<EventTypeEntity>}
   */
  async findById(id) {
    const eventType = await this.model.findByPk(id);

    return this.prepareEntity(eventType);
  }

  /**
   * Find by ID cached.
   * @param {number} id
   * @returns {Promise<EventTypeEntity>}
   */
  async findByIdCached(id) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    const eventType = await this.findById(id);
    this.cache.set(id, eventType);
    return eventType;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {EventTypeEntity}
   */
  prepareEntity(item) {
    return new EventTypeEntity({
      id: item.id,
      name: item.name,
    });
  }

  /**
   * Prepare for model.
   * @param {EventTypeEntity} item Item.
   * @returns {{name: string}}
   */
  prepareForModel(item) {
    return {
      name: item.name,
    };
  }
}

module.exports = EventTypeModel;
