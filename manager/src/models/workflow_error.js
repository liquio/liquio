const Sequelize = require('sequelize');
const Model = require('./model');

class WorkflowErrorModel extends Model {
  constructor() {
    if (!WorkflowErrorModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowError',
        {
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          service_name: Sequelize.STRING,
          data: Sequelize.JSON,
          type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: ['error', 'warning'],
            defaultValue: 'error',
          },
        },
        {
          tableName: 'workflow_errors',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      WorkflowErrorModel.singleton = this;
    }

    return WorkflowErrorModel.singleton;
  }

  /**
   * Create.
   * @param {object} data Data object.
   */
  async create(data) {
    await this.model.create({ workflow_id: data.queueMessage && data.queueMessage.workflowId, service_name: 'manager', data });
  }
}

module.exports = WorkflowErrorModel;
