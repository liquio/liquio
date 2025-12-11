const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowTemplateCategoryEntity = require('../entities/workflow_template_category');

class WorkflowTemplateCategoryModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowTemplateCategoryModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowTemplateCategory',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          parent_id: Sequelize.INTEGER,
          name: Sequelize.STRING,
        },
        {
          tableName: 'workflow_template_categories',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      WorkflowTemplateCategoryModel.singleton = this;
    }

    return WorkflowTemplateCategoryModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowTemplateCategoryEntity>}
   */
  async findById(id) {
    const workflowTemplateCategory = await this.model.findByPk(id);

    return this.prepareEntity(workflowTemplateCategory);
  }

  /**
   * Get all.
   * @returns {Promise<WorkflowTemplateCategoryEntity[]>}
   */
  async getAll() {
    const workflowTemplateCategories = await this.model.findAll();

    const workflowTemplateCategoryEntities = workflowTemplateCategories.map((item) => {
      return this.prepareEntity(item);
    });

    return workflowTemplateCategoryEntities;
  }

  /**
   * Get all with pagination.
   * @returns {Promise<WorkflowTemplateCategoryEntity[]>}
   */
  async getAllWithPagination({ currentPage, perPage }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
    };

    const workflowTemplateCategoryEntities = await this.model.paginate(sequelizeOptions);

    workflowTemplateCategoryEntities.data = workflowTemplateCategoryEntities.data.map((item) => this.prepareEntity(item));

    return workflowTemplateCategoryEntities;
  }

  /**
   * Create workflow template category.
   * @param {WorkflowTemplateCategoryEntity} workflowTemplateCategoryEntity Workflow template category entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<WorkflowTemplateCategoryEntity>}
   */
  async create(workflowTemplateCategoryEntity, transaction) {
    if (!(workflowTemplateCategoryEntity instanceof WorkflowTemplateCategoryEntity)) {
      throw new Error('Must be instance of WorkflowTemplateCategoryEntity');
    }

    global.log.save('workflow_template_category|create', { workflowTemplateCategoryEntity });

    const [data] = await this.model.upsert(this.prepareForModel(workflowTemplateCategoryEntity), { 
      returning: true,
      transaction,
      conflictFields: ['id']
    });

    return this.prepareEntity(data);
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @returns {Promise<number}
   */
  async deleteById(id) {
    return await this.model.destroy({
      where: { id },
    });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowTemplateCategoryEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new WorkflowTemplateCategoryEntity({
      id: item.id,
      parentId: item.parent_id,
      name: item.name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowTemplateCategoryEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      parent_id: item.parentId,
      name: item.name,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = WorkflowTemplateCategoryModel;
