const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowModel = require('./workflow');
const TaskEntity = require('../entities/task');

class TaskModel extends Model {
  constructor() {
    if (!TaskModel.singleton) {
      super();

      this.model = this.db.define(
        'task',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          task_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'task_templates', key: 'id' },
          },
          document_id: {
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          signer_users: Sequelize.ARRAY(Sequelize.STRING),
          performer_users: Sequelize.ARRAY(Sequelize.STRING),
          performer_users_ipn: Sequelize.ARRAY(Sequelize.STRING),
          performer_units: Sequelize.ARRAY(Sequelize.INTEGER),
          tags: Sequelize.ARRAY(Sequelize.INTEGER),
          data: Sequelize.JSON,
          finished: Sequelize.BOOLEAN,
          finished_at: Sequelize.DATE,
          deleted: Sequelize.BOOLEAN,
          cancellation_type_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          due_date: Sequelize.DATE,
          only_for_heads: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
        },
        {
          tableName: 'tasks',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      const workflowModel = new WorkflowModel();
      this.workflowModel = workflowModel;
      this.model.belongsTo(workflowModel.model, { foreignKey: 'workflow_id', targetKey: 'id' });

      TaskModel.singleton = this;
    }

    return TaskModel.singleton;
  }

  /**
   * Find by ID.
   * @param {string} id
   * @returns {Promise<TaskEntity>}
   */
  async findById(id) {
    const task = await this.model.findByPk(id);
    if (!task) {
      return;
    }

    const workflow = await task.getWorkflow();
    if (!workflow) {
      return;
    }

    const taskEntity = this.prepareEntity(task);
    taskEntity.workflowEntity = this.workflowModel.prepareEntity(workflow);

    return taskEntity;
  }

  /**
   * Cancel all in progress.
   * @param {string} workflowId Workflow ID.
   */
  async cancelAllInProgress(workflowId) {
    await this.model.update(
      { cancellation_type_id: 2, finished: true, finished_at: Sequelize.fn('NOW') },
      { where: { workflow_id: workflowId, finished: false } },
    );
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {TaskEntity}
   */
  prepareEntity(item) {
    return new TaskEntity({
      id: item.id,
      workflowId: item.workflow_id,
      name: item.name,
      description: item.description,
      taskTemplateId: item.task_template_id,
      documentId: item.document_id,
      signerUsers: item.signer_users,
      performerUsers: item.performer_users,
      performerUsersIpn: item.performer_users_ipn,
      performerUnits: item.performer_units,
      tags: item.tags,
      data: item.data,
      cancellationTypeId: item.cancellation_type_id,
      finished: item.finished,
      deleted: item.deleted,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      dueDate: item.due_date,
      onlyForHeads: item.only_for_heads,
    });
  }

  /**
   * Prepare for model.
   * @param {TaskEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      workflow_id: item.workflowId,
      name: item.name,
      description: item.description,
      task_template_id: item.taskTemplateId,
      document_id: item.documentId,
      signer_users: item.signerUsers,
      performer_users: item.performerUsers,
      performer_users_ipn: item.performerUsersIpn,
      performer_units: item.performerUnits,
      tags: item.tags,
      data: item.data,
      cancellation_type_id: item.cancellationTypeId,
      finished: item.finished,
      deleted: item.deleted,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      due_date: item.dueDate,
      only_for_heads: item.onlyForHeads,
    };
  }
}

module.exports = TaskModel;
