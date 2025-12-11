const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentModel = require('./document');
const TaskEntity = require('../entities/task');

/**
 * Task model.
 * @typedef {import('../entities/document')} DocumentEntity
 */
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
          performer_users_email: Sequelize.ARRAY(Sequelize.STRING),
          performer_usernames: Sequelize.ARRAY(Sequelize.STRING),
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
          meta: Sequelize.JSON,
          is_system: Sequelize.BOOLEAN,
        },
        {
          tableName: 'tasks',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      const documentModel = new DocumentModel();
      this.documentModel = documentModel;
      this.model.belongsTo(documentModel.model, { foreignKey: 'document_id', targetKey: 'id' });

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

    let taskEntity = this.prepareEntity(task);

    return taskEntity;
  }

  /**
   * Get documents by workflow id.
   * @param {string} workflowId Workflow ID.
   * @param {boolean} [isCurrentOnly] Is current only indicator.
   * @returns {Promise<DocumentEntity[]>}
   */
  async getDocumentsByWorkflowId(workflowId, isCurrentOnly = true) {
    let filter = { workflow_id: workflowId };

    if (isCurrentOnly) {
      filter.is_current = true;
    }

    const tasks = await this.model.findAll({
      where: filter,
      include: [{ model: this.documentModel.model, as: 'document' }],
    });

    const documents = tasks
      .map((task) => {
        if (task.document) {
          let documentEntity = this.documentModel.prepareEntity(task.document);
          const taskEntity = this.prepareEntity(task);
          documentEntity.task = taskEntity;
          return documentEntity;
        }
        return null;
      })
      .filter((document) => document !== null);

    return documents;
  }

  /**
   * Get tasks in progress.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getTasksInProgress(workflowId) {
    const tasks = await this.model.findAll({ where: { workflow_id: workflowId, finished: false } });
    return tasks.map((item) => this.prepareEntity(item));
  }

  /**
   * Get tasks in progress.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getTasksByWorkflowId(workflowId) {
    const tasks = await this.model.findAll({ where: { workflow_id: workflowId } });
    return tasks.map((item) => this.prepareEntity(item));
  }

  /**
   * Set cancelled.
   * @param {string|string[]} id Task ID or IDs list.
   */
  async setCancelled(id) {
    await this.model.update({ cancellation_type_id: 1, finished: true, finished_at: Sequelize.fn('NOW') }, { where: { id } });
  }

  /**
   * Remove performer user from tasks by performer user ID and performer unit ID.
   * @returns {Promise<TaskEntity[]>}
   */
  async removePerformerUserFromTasks(userId, unitId) {
    const [, updatedTasks] = await this.model.update(
      { performer_users: Sequelize.fn('array_remove', Sequelize.col('performer_users'), userId) },
      {
        where: {
          performer_users: { [Sequelize.Op.overlap]: [userId] },
          performer_units: { [Sequelize.Op.overlap]: [unitId] },
        },
        returning: true,
      },
    );

    if (updatedTasks.length > 0) {
      return updatedTasks.map((item) => {
        return this.prepareEntity(item);
      });
    }
  }

  /**
   * Remove performer user list from tasks by performer user ID and performer unit ID.
   * @returns {Promise<TaskEntity[]>}
   */
  async removePerformerUserListFromTasks(userIdList, unitId) {
    // Update.
    const [updatedTasks] = await this.db.query(
      `
      UPDATE tasks
      SET updated_at = now(),
          performer_users = ARRAY(SELECT unnest(performer_users) EXCEPT SELECT unnest(ARRAY[:userIdList]::CHARACTER VARYING[]))
      WHERE performer_users && ARRAY[:userIdList]::CHARACTER VARYING[] AND performer_units && ARRAY[:unitId]::INT[]
      RETURNING *;    
    `,
      {
        replacements: {
          unitId: unitId,
          userIdList: userIdList,
        },
      },
    );

    if (updatedTasks.length > 0) {
      return updatedTasks.map((item) => {
        return this.prepareEntity(item);
      });
    }
  }

  /**
   * Find by workflow ID and task template ID.
   * @param {string} workflowId Workflow ID.
   * @param {string} taskTemplateId Task template ID.
   * @returns {Promise<{task: TaskEntity, document: DocumentEntity}>} Task and document entities promise.
   */
  async findByWorkflowIdAndTaskTemplateId(workflowId, taskTemplateId) {
    const options = {
      where: {
        workflow_id: workflowId,
        task_template_id: taskTemplateId,
        is_current: true,
      },
    };

    const task = await this.model.findOne(options);

    if (!task) {
      return;
    }

    return this.prepareEntity(task);
  }

  /**
   * Set status finished.
   * @param {string} id Task ID.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setStatusFinished(id) {
    const updateObject = {
      finished: true,
      finished_at: Sequelize.fn('NOW'),
    };

    const [, [updatedTask]] = await this.model.update(updateObject, {
      where: { id },
      returning: true,
    });

    if (!updatedTask) {
      return;
    }

    return this.prepareEntity(updatedTask);
  }

  /**
   * Update.
   * @param {string} id ID.
   * @param {object} data Data.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async update(id, data) {
    const prepared = this.prepareForModel(data);

    const [, [updated]] = await this.model.update(prepared, {
      where: { id },
      returning: true,
    });

    if (!updated) {
      return;
    }

    return this.prepareEntity(updated);
  }

  /**
   * Set performer users.
   * @param {string} id Task ID.
   * @param {string[]} performerUsers Performer users list.
   * @returns {Promise<TaskEntity>} Updated task entity promise.
   */
  async setPerformerUsers(id, performerUsers, performerUserNames) {
    // Update.
    const [, updatedTasks] = await this.model.update(
      { performer_users: performerUsers, performer_usernames: performerUserNames },
      { where: { id }, returning: true },
    );

    // Check if 1 row updated.
    if (updatedTasks && updatedTasks.length === 1) {
      // Define and return first updated row entity.
      const [updatedTask] = updatedTasks;
      return this.prepareEntity(updatedTask);
    }
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
      performerUsersEmail: item.performer_users_email,
      performerUserNames: item.performer_usernames,
      performerUnits: item.performer_units,
      tags: item.tags,
      data: item.data,
      cancellationTypeId: item.cancellation_type_id,
      finished: item.finished,
      finishedAt: item.finished_at,
      deleted: item.deleted,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      dueDate: item.due_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      meta: item.meta,
      isSystem: item.is_system,
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
      performer_users_email: item.performerUsersEmail,
      performer_usernames: item.performerUserNames,
      performer_units: item.performerUnits,
      tags: item.tags,
      data: item.data,
      cancellation_type_id: item.cancellationTypeId,
      finished: item.finished,
      finished_at: item.finishedAt,
      deleted: item.deleted,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      due_date: item.dueDate,
      meta: item.meta,
      is_system: item.isSystem,
    };
  }
}

module.exports = TaskModel;
