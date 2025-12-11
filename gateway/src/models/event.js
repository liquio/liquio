const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentModel = require('./document');
const EventEntity = require('../entities/event');

/**
 * Event model.
 * @typedef {import('../entities/document')} DocumentEntity
 */
class EventModel extends Model {
  constructor() {
    if (!EventModel.singleton) {
      super();

      this.model = this.db.define(
        'event',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          event_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'event_templates', key: 'id' },
          },
          event_type_id: {
            type: Sequelize.INTEGER,
            references: { model: 'event_types', key: 'id' },
          },
          workflow_id: {
            type: Sequelize.UUID,
            references: { model: 'workflows', key: 'id' },
          },
          cancellation_type_id: Sequelize.INTEGER,
          name: Sequelize.STRING,
          done: Sequelize.BOOLEAN,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          document_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'documents', key: 'id' },
          },
        },
        {
          tableName: 'events',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      const documentModel = new DocumentModel();
      this.documentModel = documentModel;
      this.model.belongsTo(documentModel.model, { foreignKey: 'document_id', targetKey: 'id' });

      EventModel.singleton = this;
    }

    return EventModel.singleton;
  }

  /**
   * Get events by workflow id.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getEventsByWorkflowId(workflowId) {
    const events = await this.model.findAll({ where: { workflow_id: workflowId }, order: [['created_at', 'asc']] });
    return events.map((item) => this.prepareEntity(item));
  }

  /**
   * Get documents by workflow id.
   * @param {string} workflowId Workflow ID.
   * @param {boolean} [isCurrentOnly] Is current only indicator.
   * @returns {Promise<DocumentEntity[]>} Document entities promise.
   */
  async getDocumentsByWorkflowId(workflowId, _isCurrentOnly = true) {
    let filter = { workflow_id: workflowId };
    // FIXIT: Check next line later. Incorrect filter: Event without `is_current` field.
    // if (isCurrentOnly) { filter.is_current = true; }
    const events = await this.model.findAll({ where: filter });
    let documents = [];
    if (events) {
      for (const event of events) {
        const document = await event.getDocument();
        if (document) {
          documents.push(this.documentModel.prepareEntity(document));
        }
      }
    }

    return documents;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {EventEntity}
   */
  prepareEntity(item) {
    return new EventEntity({
      id: item.id,
      eventTemplateId: item.event_template_id,
      eventTypeId: item.event_type_id,
      workflowId: item.workflow_id,
      cancellationTypeId: item.cancellation_type_id,
      name: item.name,
      done: item.done,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      data: item.data,
      documentId: item.document_id,
    });
  }

  /**
   * Prepare for model.
   * @param {EventEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      event_template_id: item.eventTemplateId,
      event_type_id: item.eventTypeId,
      workflow_id: item.workflowId,
      cancellation_type_id: item.cancellationTypeId,
      name: item.name,
      done: item.done,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      data: item.data,
      document_id: item.documentId,
    };
  }
}

module.exports = EventModel;
