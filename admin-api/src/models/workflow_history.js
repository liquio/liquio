const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowHistoryEntity = require('../entities/workflow_history');

class WorkflowHistoryModel extends Model {
  constructor(dbInstance) {
    if (!WorkflowHistoryModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowHistory',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          workflow_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'workflow_templates', key: 'id' },
          },
          user_id: Sequelize.STRING,
          data: Sequelize.TEXT,
          version: Sequelize.STRING,
          is_current_version: Sequelize.BOOLEAN,
          meta: Sequelize.JSONB,
          name: Sequelize.STRING,
          description: Sequelize.STRING,
        },
        {
          tableName: 'workflow_history',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      WorkflowHistoryModel.singleton = this;
    }

    return WorkflowHistoryModel.singleton;
  }

  /**
   * Create.
   * @param {WorkflowHistoryEntity} workflowHistoryEntity Workflow history entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<WorkflowHistoryEntity>}
   */
  async create(workflowHistoryEntity, transaction) {
    if (!(workflowHistoryEntity instanceof WorkflowHistoryEntity)) {
      throw new Error('Must be instance of WorkflowHistoryEntity');
    }

    const createdWorkflowHistory = await this.model.create(this.prepareForModel(workflowHistoryEntity), { transaction });

    const entity = this.prepareEntity(createdWorkflowHistory);

    const { workflowTemplateId, updatedAt } = entity;
    await global.models.workflowTemplate.setUpdatedAt(workflowTemplateId, updatedAt, transaction);

    return entity;
  }

  /**
   * Delete by workflow template ID.
   * @param {number} id ID.
   * @param {any} transaction Transaction.
   * @returns {Promise<number}
   */
  async deleteByWorkflowTemplateId(workflowTemplateId, transaction) {
    return await this.model.destroy({
      where: { workflow_template_id: workflowTemplateId },
      transaction,
    });
  }

  /**
   * Get versions by workflow template ID.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<WorkflowHistoryEntity[]>}
   */
  async getVersionsByWorkflowTemplateId(workflowTemplateId) {
    const workflowHistory = await this.model.findAll({
      attributes: ['id', 'workflow_template_id', 'user_id', 'version', 'is_current_version', 'name', 'description', 'meta', 'created_at'],
      where: { workflow_template_id: workflowTemplateId, version: { [Sequelize.Op.ne]: null } },
      order: [['created_at', 'desc']],
    });

    const workflowHistoryEntities = workflowHistory.map((item) => {
      return this.prepareEntity(item);
    });

    return workflowHistoryEntities;
  }

  /**
   * Find last by workflow template ID.
   * @param {number} workflowTemplateId Workflow template ID.
   * @returns {Promise<WorkflowHistoryEntity>}
   */
  async findLastByWorkflowTemplateId(workflowTemplateId) {
    const workflowHistory = await this.model.findOne({
      where: { workflow_template_id: workflowTemplateId },
      order: [['created_at', 'desc']],
    });

    if (!workflowHistory) {
      return;
    }

    return this.prepareEntity(workflowHistory);
  }

  /**
   * Find last version by workflow template ID.
   * @param {number} workflowTemplateId Workflow template ID.
   */
  async findLastVersionByWorkflowTemplateId(workflowTemplateId) {
    const workflowHistory = await this.model.findOne({
      where: { workflow_template_id: workflowTemplateId, is_current_version: true },
      order: [['created_at', 'desc']],
    });

    if (!workflowHistory) {
      return;
    }

    return this.prepareEntity(workflowHistory);
  }

  /**
   * Delete is_current_version by workflow template ID.
   * @param {number} workflowTemplateId Workflow template ID.
   */
  async deleteIsCurrentVersionByWorkflowTemplateId(workflowTemplateId) {
    await this.model.update(
      { is_current_version: false },
      {
        where: { workflow_template_id: workflowTemplateId },
      },
    );
  }

  /**
   * Find version by workflow template ID and version.
   * @param {number} workflowTemplateId Workflow template ID.
   * @param {string} version Version.
   */
  async findVersionByWorkflowTemplateIdAndVersion(workflowTemplateId, version) {
    const workflowHistory = await this.model.findOne({
      where: { workflow_template_id: workflowTemplateId, version: version },
      order: [['created_at', 'desc']],
    });

    if (!workflowHistory) {
      return;
    }

    return this.prepareEntity(workflowHistory);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowHistoryEntity}
   */
  prepareEntity(item) {
    let data;
    try {
      data = JSON.parse(item.data);
    } catch {
      data = {};
    }

    return new WorkflowHistoryEntity({
      id: item.id,
      workflowTemplateId: item.workflow_template_id,
      userId: item.user_id,
      data: data,
      version: item.version,
      isCurrentVersion: item.is_current_version,
      meta: item.meta,
      name: item.name,
      description: item.description,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowHistoryEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      workflow_template_id: item.workflowTemplateId,
      user_id: item.userId,
      data: JSON.stringify(item.data),
      version: item.version,
      is_current_version: item.isCurrentVersion,
      meta: item.meta,
      name: item.name,
      description: item.description,
    };
  }
}

module.exports = WorkflowHistoryModel;
