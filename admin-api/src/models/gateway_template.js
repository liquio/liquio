const Sequelize = require('sequelize');

const Model = require('./model');
const GatewayTemplateEntity = require('../entities/gateway_template');
const beautifyJSON = require('../lib/beautifyJSON');
const { parseJSONCSchema, validateJSONCSchema } = require('../lib/jsonc_helper');

class GatewayTemplateModel extends Model {
  constructor(dbInstance) {
    if (!GatewayTemplateModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'gatewayTemplate',
        {
          gateway_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'gateway_types', key: 'id' },
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          json_schema: Sequelize.TEXT,
        },
        {
          tableName: 'gateway_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

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
    const gatewayTemplate = await this.model.findByPk(id);

    return this.prepareEntity(gatewayTemplate);
  }

  /**
   * Create gateway template.
   * @param {GatewayTemplateEntity} gatewayTemplateEntity Gateway template entity.
   * @param {any} [transaction] Transaction.
   * @returns {Promise<array>}
   */
  async create(gatewayTemplateEntity, transaction) {
    if (!(gatewayTemplateEntity instanceof GatewayTemplateEntity)) {
      throw new Error('Must be instance of GatewayTemplateEntity');
    }

    const params = {
      returning: true,
      ...(transaction && { transaction }),
    };

    const [data] = await this.model.upsert(this.prepareForModel(gatewayTemplateEntity), params);

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
   * @returns {GatewayTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new GatewayTemplateEntity({
      id: item.id,
      gatewayTypeId: item.gateway_type_id,
      name: item.name,
      description: item.description,
      jsonSchema: parseJSONCSchema(item.json_schema),
      jsonSchemaRaw: beautifyJSON(item.json_schema),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    if (item.jsonSchemaRaw) {
      validateJSONCSchema(item.jsonSchemaRaw);
    }

    return {
      id: item.id,
      gateway_type_id: item.gatewayTypeId,
      name: item.name,
      description: item.description,
      json_schema: item.jsonSchemaRaw || JSON.stringify(item.jsonSchema),
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = GatewayTemplateModel;
