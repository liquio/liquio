const Sequelize = require('sequelize');
const Model = require('./model');
const GatewayEntity = require('../entities/gateway');

class GatewayModel extends Model {
  constructor() {
    if (!GatewayModel.singleton) {
      super();

      this.model = this.db.define(
        'gateway',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          gateway_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'gateway_templates', key: 'id' }
          },
          gateway_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'gateway_types', key: 'id' }
          },
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' }
          },
          name: Sequelize.STRING,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          version: {
            allowNull: true,
            type: Sequelize.STRING
          }
        },
        {
          tableName: 'gateways',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      GatewayModel.singleton = this;
    }

    return GatewayModel.singleton;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {GatewayEntity}
   */
  prepareEntity(item) {
    return new GatewayEntity({
      id: item.id,
      gatewayTemplateId: item.gateway_template_id,
      gatewayTypeId: item.gateway_type_id,
      workflowId: item.workflow_id,
      name: item.name,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      data: item.data,
      version: item.version,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }
}

module.exports = GatewayModel;
