const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowModel = require('./workflow');
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
            references: { model: 'gateway_templates', key: 'id' },
          },
          gateway_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'gateway_types', key: 'id' },
          },
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          name: Sequelize.STRING,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
        },
        {
          tableName: 'gateways',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      const workflowModel = new WorkflowModel();
      this.workflowModel = workflowModel;
      this.model.belongsTo(workflowModel.model, { foreignKey: 'workflow_id', targetKey: 'id' });

      GatewayModel.singleton = this;
    }

    return GatewayModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<GatewayEntity>}
   */
  async findById(id) {
    const gateway = await this.model.findByPk(id);
    if (!gateway) {
      return;
    }

    const workflow = await gateway.getWorkflow();
    if (!workflow) {
      return;
    }

    const gatewayEntity = this.prepareEntity(gateway);
    gatewayEntity.workflowEntity = this.workflowModel.prepareEntity(workflow);

    return gatewayEntity;
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
    });
  }

  /**
   * Prepare for model.
   * @param {GatewayEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      gateway_template_id: item.gatewayTemplateId,
      gateway_type_id: item.gatewayTypeId,
      workflow_id: item.workflowId,
      name: item.name,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      data: item.data,
    };
  }
}

module.exports = GatewayModel;
