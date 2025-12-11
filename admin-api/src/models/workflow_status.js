const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowStatusEntity = require('../entities/workflow_status');

class WorkflowStatusModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowStatusModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowStatus',
        {
          name: Sequelize.STRING,
        },
        {
          tableName: 'workflow_statuses',
          underscored: true,
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowStatusModel.singleton = this;
    }

    return WorkflowStatusModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowStatusEntity[]>}
   */
  async getAll() {
    let workflowStatuses = await this.model.findAll();

    workflowStatuses = workflowStatuses.map((item) => {
      return this.prepareEntity(item);
    });

    return workflowStatuses;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowStatusEntity}
   */
  prepareEntity(item) {
    return new WorkflowStatusEntity({
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }
}

module.exports = WorkflowStatusModel;
