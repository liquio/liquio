const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowDebugEntity = require('../entities/workflow_debug');

class WorkflowDebugModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowDebugModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowDebug',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.STRING(32),
          },
          workflow_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          service_name: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['task', 'event', 'gateway', 'manager'],
          },
          data: {
            allowNull: true,
            type: Sequelize.JSON,
          },
        },
        {
          tableName: 'workflow_debug',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowDebugModel.singleton = this;
    }

    return WorkflowDebugModel.singleton;
  }

  /**
   * Create.
   * @param {object} options Options.
   * @param {string} options.id ID.
   * @param {string} options.workflowId Workflow ID.
   * @param {string} options.serviceName Service name.
   * @param {object} options.data Data.
   */
  async create({ id, workflowId, serviceName, data }) {
    await this.model.create({
      id,
      workflow_id: workflowId,
      service_name: serviceName,
      data,
    });
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<WorkflowDebugEntity>}
   */
  async findById(id) {
    const workflowDebug = await this.model.findByPk(id);

    if (!workflowDebug) {
      return;
    }

    return this.prepareEntity(workflowDebug);
  }

  /**
   * Get all by workflow ID.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<WorkflowDebugEntity[]>} Workflow debug list promise.
   */
  async getAllByWorkflowId(workflowId) {
    const workflowDebug = await this.model.findAll({
      where: { workflow_id: workflowId },
      order: [['created_at', 'desc']],
    });
    if (!workflowDebug) {
      return [];
    }

    return workflowDebug.map(this.prepareEntity);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowDebugEntity}
   */
  prepareEntity(item) {
    return new WorkflowDebugEntity({
      id: item.id,
      workflowId: item.workflow_id,
      serviceName: item.service_name,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }
}

module.exports = WorkflowDebugModel;
