const Sequelize = require('sequelize');

const Model = require('./model');
const GatewayTypeEntity = require('../entities/gateway_type');

class GatewayTypeModel extends Model {
  constructor() {
    if (!GatewayTypeModel.singleton) {
      super();

      this.model = this.db.define(
        'gatewayType',
        {
          name: { type: Sequelize.ENUM, values: ['parallel', 'exclusive', 'inclusive'] },
        },
        {
          tableName: 'gateway_types',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      GatewayTypeModel.singleton = this;
    }

    return GatewayTypeModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<GatewayTypeEntity>}
   */
  async findById(id) {
    const gatewayType = await this.model.findByPk(id);

    return this.prepareEntity(gatewayType);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {GatewayTypeEntity}
   */
  prepareEntity(item) {
    return new GatewayTypeEntity({
      id: item.id,
      name: item.name,
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayTypeEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      name: item.name,
    };
  }
}

module.exports = GatewayTypeModel;
