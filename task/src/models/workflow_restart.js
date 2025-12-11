const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowRestartEntity = require('../entities/workflow_restart');

class WorkflowRestartModel extends Model {
  constructor() {
    if (!WorkflowRestartModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowRestart',
        {
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          workflow_error_id: {
            type: Sequelize.INTEGER,
            references: { model: 'workflow_errors', key: 'id' },
          },
          type: {
            type: Sequelize.ENUM,
            values: ['error', 'manual'],
          },
          data: Sequelize.JSONB,
        },
        {
          tableName: 'workflow_restarts',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowRestartModel.singleton = this;
    }

    return WorkflowRestartModel.singleton;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowRestartEntity}
   */
  prepareEntity(item) {
    return new WorkflowRestartEntity({
      id: item.id,
      workflowId: item.workflow_id,
      workflowErrorId: item.workflow_error_id,
      type: item.type,
      data: item.data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowRestartEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      workflow_id: item.workflowId,
      workflow_error_id: item.workflowErrorId,
      type: item.type,
      data: item.data
    };
  }
}

module.exports = WorkflowRestartModel;
