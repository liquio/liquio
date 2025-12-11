const Sequelize = require('sequelize');

const Model = require('./model');
const TaskTemplateEntity = require('../entities/task_template');
const beautifyJSON = require('../lib/beautifyJSON');
const { parseJSONCSchema, validateJSONCSchema } = require('../lib/jsonc_helper');

class TaskTemplateModel extends Model {
  constructor(dbInstance) {
    if (!TaskTemplateModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'taskTemplate',
        {
          name: Sequelize.STRING,
          document_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_templates', key: 'id' },
          },
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

      this.model.prototype.prepareEntity = this.prepareEntity;

      TaskTemplateModel.singleton = this;
    }

    return TaskTemplateModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<TaskTemplateEntity[]>}
   */
  async getAll() {
    const taskTemplates = await this.model.findAll({ attributes: ['id', 'name'] });

    const taskTemplatesEntities = taskTemplates.map((item) => {
      return this.prepareEntity(item);
    });

    return taskTemplatesEntities;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<TaskTemplateEntity>}
   */
  async findById(id) {
    const taskTemplate = await this.model.findByPk(id);

    return this.prepareEntity(taskTemplate);
  }

  /**
   * Create task template.
   * @param {TaskTemplateEntity} taskTemplateEntity Task template entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<TaskTemplateEntity>}
   */
  async create(taskTemplateEntity, transaction) {
    if (!(taskTemplateEntity instanceof TaskTemplateEntity)) {
      throw new Error('Must be instance of TaskTemplateEntity');
    }

    const [data] = await this.model.upsert(this.prepareForModel(taskTemplateEntity), { returning: true, transaction });

    return this.prepareEntity(data);
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @param {any} transaction Transaction.
   * @returns {Promise<number}
   */
  async deleteById(id, transaction) {
    return await this.model.destroy({
      where: { id },
      transaction,
    });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {TaskTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new TaskTemplateEntity({
      id: item.id,
      name: item.name,
      documentTemplateId: item.document_template_id,
      jsonSchema: parseJSONCSchema(item.json_schema),
      jsonSchemaRaw: beautifyJSON(item.json_schema),
      htmlTemplate: item.html_template,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {TaskTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    if (item.jsonSchemaRaw) {
      validateJSONCSchema(item.jsonSchemaRaw);
    }

    return {
      id: item.id,
      name: item.name,
      document_template_id: item.documentTemplateId,
      json_schema: item.jsonSchemaRaw || JSON.stringify(item.jsonSchema),
      html_template: item.htmlTemplate,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = TaskTemplateModel;
