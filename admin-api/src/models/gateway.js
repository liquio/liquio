const Sequelize = require('sequelize');
const Model = require('./model');
const GatewayEntity = require('../entities/gateway');

class GatewayModel extends Model {
  constructor(dbInstance) {
    if (!GatewayModel.singleton) {
      super(dbInstance);

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

      this.model.prototype.prepareEntity = this.prepareEntity;

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
    const gateway = await this.model.findByPk(id, { include: [{ model: models.workflow.model }] });
    if (!gateway) {
      return;
    }

    if (gateway.workflow) {
      gateway.workflow = gateway.workflow.prepareEntity(gateway.workflow);
    }

    return this.prepareEntity(gateway);
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
   * @returns {Promise<GatewayEntity>} Created gateway entity promise.
   */
  async create({ gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data }) {
    // Prepare gateway record.
    const gateway = this.prepareForModel({ gatewayTemplateId, gatewayTypeId, workflowId, name, createdBy, updatedBy, data });

    // Create and return gateway.
    const createdGateway = await this.model.create(gateway);

    // Return created gateway.
    return this.prepareEntity(createdGateway);
  }

  /**
   * Delete gateway by workflow id and gateway template id.
   * @param {string} workflowId - Workflow id.
   * @param {number} gatewayTemplateId - Gateway template id.
   */
  async deleteGateway(workflowId, gatewayTemplateId) {
    return await this.db.query(
      `DELETE FROM gateways gt USING (
            SELECT id
            FROM (
                    SELECT id,
                        ROW_NUMBER() OVER (
                            ORDER BY created_at ASC
                        ) AS row_number_asc,
                        ROW_NUMBER() OVER (
                            ORDER BY created_at DESC
                        ) AS row_number_desc
                    FROM gateways
                    WHERE workflow_id = :workflowId
                        AND gateway_template_id = :gatewayTemplateId
                ) subquery
            WHERE row_number_asc > 1
                AND row_number_desc > 2
        ) to_delete
      WHERE gt.id = to_delete.id`,
      {
        raw: true,
        replacements: { workflowId, gatewayTemplateId },
        type: this.db.QueryTypes.DELETE,
      },
    );
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
      createdAt: item.created_at,
      updatedAt: item.updated_at,
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
