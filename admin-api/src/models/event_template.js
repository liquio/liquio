const Sequelize = require('sequelize');

const Model = require('./model');
const EventTemplateEntity = require('../entities/event_template');
const beautifyJSON = require('../lib/beautifyJSON');
const { parseJSONCSchema, validateJSONCSchema } = require('../lib/jsonc_helper');

class EventTemplateModel extends Model {
  constructor(dbInstance) {
    if (!EventTemplateModel.singleton) {
      super(dbInstance);

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

      this.model.prototype.prepareEntity = this.prepareEntity;

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
   * Create event template.
   * @param {EventTemplateEntity} eventTemplateEntity Event template entity.
   * @param {any} [transaction] Transaction.
   * @returns {Promise<array>}
   */
  async create(eventTemplateEntity, transaction) {
    if (!(eventTemplateEntity instanceof EventTemplateEntity)) {
      throw new Error('Must be instance of EventTemplateEntity');
    }

    const params = {
      returning: true,
      ...(transaction && { transaction }),
    };

    const [data] = await this.model.upsert(this.prepareForModel(eventTemplateEntity), params);

    return this.prepareEntity(data);
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @param {any} transaction Transaction.
   * @returns {Promise<number}
   */
  async deleteById(id, transaction) {
    return await this.model.destroy({
      where: { id },
      transaction,
    });
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

    return new EventTemplateEntity({
      id: item.id,
      eventTypeId: item.event_type_id,
      name: item.name,
      description: item.description,
      jsonSchema: parseJSONCSchema(item.json_schema),
      jsonSchemaRaw: beautifyJSON(item.json_schema),
      htmlTemplate: item.html_template,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {EventTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    if (item.jsonSchemaRaw) {
      validateJSONCSchema(item.jsonSchemaRaw);
    }

    return {
      id: item.id,
      event_type_id: item.eventTypeId,
      name: item.name,
      description: item.description,
      json_schema: item.jsonSchemaRaw || JSON.stringify(item.jsonSchema),
      html_template: item.htmlTemplate,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = EventTemplateModel;
