const Sequelize = require('sequelize');

const Model = require('./model');

/**
 * Task Template model.
 */
class TaskTemplateModel extends Model {
  constructor() {
    if (!TaskTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'taskTemplate',
        {
          id: { primaryKey: true, type: Sequelize.INTEGER, autoIncrement: false },
          name: Sequelize.STRING,
          document_template_id: Sequelize.INTEGER,
          json_schema: Sequelize.TEXT,
          html_template: Sequelize.TEXT,
        },
        {
          tableName: 'task_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      TaskTemplateModel.singleton = this;
    }

    return TaskTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<object>} Task template.
   */
  async findById(id) {
    return this.model.findByPk(id);
  }
}

module.exports = TaskTemplateModel;
