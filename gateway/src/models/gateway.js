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
          version: {
            allowNull: true,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'gateways',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      GatewayModel.singleton = this;
    }

    return GatewayModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} data.gatewayTemplateId Gateway template ID.
   * @param {number} data.gatewayTypeId Gateway type ID.
   * @param {number} data.workflowId Workflow ID.
   * @param {string} data.name Name.
   * @param {string} data.createdBy Created by user ID.
   * @param {string} data.updatedBy Updated by user ID.
   * @param {object} data.data Data.
   * @param {string} data.version Version.
   * @returns {Promise<GatewayEntity>} Created gateway entity promise.
   */
  async create({ gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data, version }) {
    // Prepare gateway record.
    const gateway = this.prepareForModel({ gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data, version });

    // Create and return gateway.
    const createdGateway = await this.model.create(gateway);

    // Return created gateway.
    return this.prepareEntity(createdGateway);
  }

  /**
   * Get latest gateway in workflow.
   * @param {Number} gatewayTemplateId Gateway template Id.
   * @param {string} workflowId Workflow Id.
   * @returns {Promise<GatewayEntity>} Created gateway entity promise.
   */
  async getLatestGatewayInWorkflow(gatewayTemplateId, workflowId) {
    const gateway = await this.model.findOne({
      where: {
        gateway_template_id: gatewayTemplateId,
        workflow_id: workflowId,
      },
      order: [['created_at', 'desc']],
    });

    return this.prepareEntity(gateway);
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
      version: item.version,
    };
  }
}

module.exports = GatewayModel;
