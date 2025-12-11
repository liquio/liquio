const Sequelize = require('sequelize');
const Model = require('./model');
const EventEntity = require('../entities/event');

class EventModel extends Model {
  constructor() {
    if (!EventModel.singleton) {
      super();

      this.model = this.db.define(
        'event',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          event_template_id: Sequelize.INTEGER,
          event_type_id: Sequelize.INTEGER,
          workflow_id: Sequelize.UUID,
          cancellation_type_id: Sequelize.INTEGER,
          name: Sequelize.STRING,
          done: Sequelize.BOOLEAN,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          document_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'documents', key: 'id' }
          },
          version: {
            allowNull: true,
            type: Sequelize.STRING
          }
        },
        {
          tableName: 'events',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      EventModel.singleton = this;
    }

    return EventModel.singleton;
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
      data: item.data,
      documentId: item.document_id,
      version: item.version,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }

  /**
   * Get events by workflow ID.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<DocumentEntity[]>}
   */
  async getEventsByWorkflowId(workflowId) {
    const events = await this.model.findAll({
      where: { workflow_id: workflowId, done: true }
    });

    return events.map(item => this.prepareEntity(item));
  }


  /**
   * Check exists.
   * @param {string[]} workflowIds Workflow template ID.
   * @param {boolean} isFinal Is final indicator.
   * @param {Date} updatedAtFrom Updated from date.
   * @returns {Promise<boolean>} Is exists indicator promise.
   */
  async checkExistDocumentsByWorkflowIds(workflowIds, isFinal, updatedAtFrom) {
    const rawDocument = await this.model.findOne({
      where: {
        document_id: {[Sequelize.Op.ne]: null},
        done: isFinal,
        workflow_id: {[Sequelize.Op.in]: workflowIds},
        updated_at: { [Sequelize.Op.gte]: updatedAtFrom }
      },
      attributes: ['document_id']
    });

    const exists = !!rawDocument;

    return exists;
  }
}

module.exports = EventModel;
