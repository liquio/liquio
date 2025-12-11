const Sequelize = require('sequelize');

const Model = require('./model');
const GatewayTemplateEntity = require('../entities/gateway_template');

class GatewayTemplateModel extends Model {
  constructor() {
    if (!GatewayTemplateModel.singleton) {
      super();

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
   * Find ID and name by ID.
   * @param {number} id ID.
   * @returns {Promise<{id: number, name: string}>} Gateway template data.
   */
  async findIdAndNameById(id) {
    const gatewayTemplate = await this.model.findByPk(id, { attributes: ['id', 'name'] });

    return this.prepareEntity(gatewayTemplate);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {GatewayTemplateEntity}
   */
  prepareEntity(item) {
    return new GatewayTemplateEntity({
      id: item.id,
      gatewayTypeId: item.gateway_type_id,
      name: item.name,
      description: item.description,
      jsonSchema: item.json_schema,
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      gateway_type_id: item.gatewayTypeId,
      name: item.name,
      description: item.description,
      json_schema: item.jsonSchema,
    };
  }
}

module.exports = GatewayTemplateModel;
