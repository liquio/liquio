const Sequelize = require('sequelize');
const Dictionary = require('./dictionary');

class WorkflowStatusDictionaryModel extends Dictionary {
  constructor() {
    if (!WorkflowStatusDictionaryModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowStatus',
        {
          name: Sequelize.STRING
        },
        {
          tableName: 'workflow_statuses',
          underscored: true,
          defaultScope: {
            attributes: {
              exclude: ['created_at', 'updated_at']
            }
          }
        }
      );

      WorkflowStatusDictionaryModel.singleton = this;
    }

    return WorkflowStatusDictionaryModel.singleton;
  }

  /**
   * Get dictionary name.
   * @returns {string}
   */
  get name() {
    return 'workflow-statuses';
  }

  /**
   * Get all data.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    return await this.model.findAll();
  }
}

module.exports = WorkflowStatusDictionaryModel;
