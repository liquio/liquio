const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentModel = require('./document');
const DocumentAttachmentModel = require('./document_attachment');
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
          signer_users: Sequelize.ARRAY(Sequelize.UUID),
          performer_users: Sequelize.ARRAY(Sequelize.UUID),
          performer_units: Sequelize.ARRAY(Sequelize.UUID),
          tags: Sequelize.ARRAY(Sequelize.INTEGER),
          data: Sequelize.JSON,
          cancellation_type_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          due_date: Sequelize.DATE,
        },
        {
          tableName: 'tasks',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      const documentModel = new DocumentModel();
      this.documentAttachmentModel = new DocumentAttachmentModel();
      this.documentModel = documentModel;
      this.model.belongsTo(documentModel.model, { foreignKey: 'document_id', targetKey: 'id' });

      TaskModel.singleton = this;
    }

    return TaskModel.singleton;
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
    const tasks = await this.model.findAll({ where: filter });
    let documents = [];
    if (tasks) {
      for (const task of tasks) {
        const document = await task.getDocument();
        if (document) {
          document.attachments = await this.documentAttachmentModel.getByDocumentId(document.id);
          documents.push(this.documentModel.prepareEntity(document));
        }
      }
    }

    return documents;
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
      performerUnits: item.performer_units,
      tags: item.tags,
      data: item.data,
      cancellationTypeId: item.cancellation_type_id,
      finished: item.finished,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      dueDate: item.due_date,
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
      performer_units: item.performerUnits,
      tags: item.tags,
      data: item.data,
      cancellation_type_id: item.cancellationTypeId,
      finished: item.finished,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      due_date: item.dueDate,
    };
  }
}

module.exports = TaskModel;
