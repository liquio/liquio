
const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowErrorEntity = require('../entities/workflow_error');

// Constants.
const SUPPRESSED_ERRORS = [
  'NotFoundError: Task not found.'
];

/**
 * Workflow error model.
 */
class WorkflowErrorModel extends Model {
  constructor() {
    if (!WorkflowErrorModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowError',
        {
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' }
          },
          service_name: Sequelize.STRING,
          data: Sequelize.JSON,
          type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['error', 'warning'],
            defaultValue: 'error'
          }
        },
        {
          tableName: 'workflow_errors',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowErrorModel.singleton = this;
    }

    return WorkflowErrorModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} type Type.
   */
  async create(data, type = 'error') {
    // If workflowId is not set, then we don't save the error.
    const workflowId = data?.queueMessage?.workflowId || data?.traceMeta?.workflowId;
    if (!workflowId) {
      return;
    }

    // If error is suppressed, then we don't save the error.
    const error = `${data?.error}`;
    if (SUPPRESSED_ERRORS.includes(error)) {
      return;
    }

    // Save to DB.
    await this.model.create({
      workflow_id: workflowId,
      service_name: 'task',
      data,
      type
    });
  }

  /**
   * Delete by workflow ID.
   * @param {string} id ID.
   * @returns {Promise<number} Deleted records count promise.
   */
  async deleteByWorkflowId(workflowId) {
    await this.model.destroy({ where: { workflow_id: workflowId } });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowErrorEntity}
   */
  prepareEntity(item) {
    return new WorkflowErrorEntity({
      id: item.id,
      workflowId: item.workflow_id,
      serviceName: item.service_name,
      data: item.data,
      type: item.type,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }
}

module.exports = WorkflowErrorModel;
