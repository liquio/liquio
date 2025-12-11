const Sequelize = require('sequelize');
const Model = require('./model');
const EventTypeEntity = require('../entities/event_type');

class EventTypeModel extends Model {
  constructor(dbInstance) {
    if (!EventTypeModel.singleton) {
      super(dbInstance);

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

      this.model.prototype.prepareEntity = this.prepareEntity;

      EventTypeModel.singleton = this;
    }

    return EventTypeModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<EventTypeEntity[]>}
   */
  async getAll() {
    const eventTypes = await this.model.findAll();

    const eventTypeEntities = eventTypes.map((item) => {
      return this.prepareEntity(item);
    });

    return eventTypeEntities;
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
   * Prepare entity.
   * @param {object} item Item.
   * @returns {EventTypeEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new EventTypeEntity({
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {EventTypeEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      name: item.name,
    };
  }
}

module.exports = EventTypeModel;
