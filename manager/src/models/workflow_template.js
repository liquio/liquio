const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowTemplateEntity = require('../entities/workflow_template');

class WorkflowTemplateModel extends Model {
  constructor() {
    if (!WorkflowTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'workflowTemplate',
        {
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          xml_bpmn_schema: Sequelize.TEXT,
          data: Sequelize.JSON,
          is_active: Sequelize.BOOLEAN,
        },
        {
          tableName: 'workflow_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      WorkflowTemplateModel.singleton = this;
    }

    return WorkflowTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateEntity>}
   */
  async findById(id) {
    const workflowTemplate = await this.model.findByPk(id);

    return this.prepareEntity(workflowTemplate);
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowTemplateEntity[]>}
   */
  async getAll() {
    const workflowTemplates = await this.model.findAll({ where: { is_active: true } });

    return workflowTemplates.map((item) => this.prepareEntity(item));
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateEntity}
   */
  prepareEntity(item) {
    return new WorkflowTemplateEntity({
      id: item.id,
      name: item.name,
      description: item.description,
      xmlBpmnSchema: item.xml_bpmn_schema,
      data: item.data,
      isActive: item.is_active,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      name: item.name,
      description: item.description,
      xml_bpmn_schema: item.xmlBpmnSchema,
      data: item.data,
      is_active: item.isActive,
    };
  }
}

module.exports = WorkflowTemplateModel;
