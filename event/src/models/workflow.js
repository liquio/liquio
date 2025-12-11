const Sequelize = require('sequelize');

const Model = require('./model');
const WorkflowEntity = require('../entities/workflow');

class WorkflowModel extends Model {
  constructor() {
    if (!WorkflowModel.singleton) {
      super();

      this.model = this.db.define(
        'workflow',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          workflow_template_id: Sequelize.INTEGER,
          name: Sequelize.STRING,
          is_final: Sequelize.BOOLEAN,
          cancellation_type_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          due_date: Sequelize.DATE,
          workflow_status_id: Sequelize.INTEGER,
          number: Sequelize.STRING,
          created_at: Sequelize.DATE,
          user_data: Sequelize.JSON,
          has_unresolved_errors: Sequelize.BOOLEAN,
          statuses: Sequelize.JSONB,
        },
        {
          tableName: 'workflows',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      WorkflowModel.singleton = this;
    }

    return WorkflowModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<WorkflowEntity>}
   */
  async findById(id) {
    const workflow = await this.model.findByPk(id);

    if (!workflow) {
      return;
    }

    let workflowEntity = this.prepareEntity(workflow);

    return workflowEntity;
  }

  /**
   * Set error.
   * @param {number} id Workflow ID.
   */
  async setError(id) {
    await this.model.update({ has_unresolved_errors: true }, { where: { id } });
  }

  /**
   * Set status.
   * @param {number} id Workflow ID.
   * @param {number} workflowStatusId Workflow status ID.
   * @param {object} statuses Statuses.
   */
  async setStatus(id, workflowStatusId, statuses) {
    await this.model.update({ workflow_status_id: workflowStatusId, statuses }, { where: { id } });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {WorkflowEntity}
   */
  prepareEntity(item) {
    return new WorkflowEntity({
      id: item.id,
      workflowTemplateId: item.workflow_template_id,
      name: item.name,
      isFinal: item.is_final,
      cancellationTypeId: item.cancellation_type_id,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      data: item.data,
      dueDate: item.due_date,
      workflowStatusId: item.workflow_status_id,
      number: item.number,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      userData: item.user_data,
      hasUnresolvedErrors: item.has_unresolved_errors,
      statuses: item.statuses,
    });
  }

  /**
   * Prepare for model.
   * @param {WorkflowEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      workflow_template_id: item.workflowTemplateId,
      name: item.name,
      is_final: item.isFinal,
      cancellation_type_id: item.cancellationTypeId,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      data: item.data,
      due_date: item.dueDate,
      workflow_status_id: item.workflowStatusId,
      number: item.number,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      user_data: item.userData,
      has_unresolved_errors: item.hasUnresolvedErrors,
      statuses: item.statuses,
    };
  }
}

module.exports = WorkflowModel;
