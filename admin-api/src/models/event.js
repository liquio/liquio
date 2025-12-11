const Sequelize = require('sequelize');
const Model = require('./model');
const EventEntity = require('../entities/event');

const DELAY_TYPE = 2;
const NOTIFICATION_TYPE = 1;

class EventModel extends Model {
  constructor(dbInstance) {
    if (!EventModel.singleton) {
      super(dbInstance);

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
          due_date: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        {
          tableName: 'events',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      EventModel.singleton = this;
    }

    return EventModel.singleton;
  }

  async updateById(id, event) {
    let updateResult;
    let currentEvent;
    try {
      currentEvent = await this.findById(id);
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    if (!currentEvent) {
      return;
    }

    const newEvent = this.prepareForModel(event);
    try {
      updateResult = await this.model.update(
        {
          ...newEvent,
          data: {
            ...currentEvent.data,
            dueDate: newEvent.due_date,
          },
        },
        {
          where: { id: id },
          returning: true,
        },
      );
    } catch (error) {
      throw new global.SequelizeDbError(error);
    }

    const [updatedCount, [updatedEvent]] = updateResult;
    if (updatedCount < 1) {
      return;
    }

    return this.prepareEntity(updatedEvent);
  }

  /**
   * Get running events.
   * @returns {Promise<EventEntity[]>}
   */
  async getRunningEvents() {
    const events = await this.model.findAll({
      where: { event_type_id: DELAY_TYPE, done: false, [Sequelize.Op.and]: Sequelize.literal('(data->>\'dueDate\')::timestamp <= now()') },
    });

    return events.map((item) => this.prepareEntity(item));
  }

  /**
   * Get postponed events.
   * @returns {Promise<EventEntity[]>}
   */
  async getPostponedEvents() {
    const events = await this.model.findAll({
      where: {
        event_type_id: NOTIFICATION_TYPE,
        done: false,
        [Sequelize.Op.and]: [Sequelize.literal('data->\'dueDate\' is not null'), Sequelize.literal('(data->>\'dueDate\')::timestamp <= now()')],
      },
    });

    return events.map((item) => this.prepareEntity(item));
  }

  /**
   * Get events in progress.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getEventsInProgress(workflowId) {
    const events = await this.model.findAll({ where: { workflow_id: workflowId, done: false } });
    return events.map((item) => this.prepareEntity(item));
  }

  /**
   * Set done.
   * @param {string} id Event ID.
   * @returns {Promise<EventEntity>}
   */
  async setDone(id) {
    const [, updatedEvents] = await this.model.update({ done: true }, { where: { id }, returning: true });
    if (updatedEvents.length === 1) {
      return this.prepareEntity(updatedEvents[0]);
    }
  }

  /**
   * Set cancelled.
   * @param {string|string[]} id Event ID or IDs list.
   */
  async setCancelled(id) {
    await this.model.update({ cancellation_type_id: 1, done: true }, { where: { id } });
  }

  /**
   * Set document ID by workflow ID and document template ID.
   * @param {string} workflowId Wotkflow ID.
   * @param {number} eventTemplateId Event template ID.
   * @param {string} documentId Document ID.
   */
  async setDocumentIdByWorkflowIdAndEventTemplateId(workflowId, eventTemplateId, documentId) {
    return await this.model.update({ document_id: documentId }, { where: { workflow_id: workflowId, event_template_id: eventTemplateId } });
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} data.eventTemplateId Event template ID.
   * @param {number} data.eventTypeId Event type ID.
   * @param {number} data.workflowId Workflow ID.
   * @param {string} data.name Name.
   * @param {string} data.createdBy Created by user ID.
   * @param {string} data.updatedBy Updated by user ID.
   * @param {object} data.data Data.
   * @param {boolean} data.done Done.
   * @returns {Promise<EventEntity>} Created event entity promise.
   */
  async create({ eventTemplateId, eventTypeId, workflowId, name, createdBy, updatedBy, data, done, documentId }) {
    // Prepare event record.
    const event = this.prepareForModel({ eventTemplateId, eventTypeId, workflowId, name, createdBy, updatedBy, data, done, documentId });

    // Create and return event.
    const createdEvent = await this.model.create(event);

    // Return created event.
    return this.prepareEntity(createdEvent);
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<EventEntity>}
   */
  async findById(id) {
    const event = await this.model.findByPk(id, { include: [{ model: models.workflow.model }] });
    if (!event) {
      return;
    }

    const eventEntity = this.prepareEntity(event);

    if (event.workflow) {
      eventEntity.workflow = event.workflow.prepareEntity(event.workflow);
    }

    return eventEntity;
  }

  /**
   * Cancel all in progress.
   * @param {string} workflowId Workflow ID.
   */
  async cancelAllInProgress(workflowId) {
    await this.model.update({ cancellation_type_id: 2, done: true }, { where: { workflow_id: workflowId, done: false } });
  }

  /**
   * Get events by workflow id.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getEventsByWorkflowId(workflowId) {
    const events = await this.model.findAll({ where: { workflow_id: workflowId } });
    return events.map((item) => this.prepareEntity(item));
  }

  /**
   * Get documents by workflow id.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<DocumentEntity[]>} Document entities promise.
   */
  async getDocumentsByWorkflowId(workflowId) {
    const events = await this.model.findAll({ where: { workflow_id: workflowId } });
    let documents = [];
    if (events) {
      for (const event of events) {
        const document = await event.getDocument();
        if (document) {
          documents.push(models.document.prepareEntity(document));
        }
      }
    }

    return documents;
  }

  /**
   * Delete events by workflow id and event template id.
   * @param {string} workflowId - Workflow id.
   * @param {number} eventTemplateId - Event template id.
   */
  async deleteEvents(workflowId, eventTemplateId) {
    return await this.db.query(
      `DELETE FROM events e USING (
            SELECT id
            FROM (
                    SELECT id,
                        ROW_NUMBER() OVER (
                            ORDER BY created_at ASC
                        ) AS row_number_asc,
                        ROW_NUMBER() OVER (
                            ORDER BY created_at DESC
                        ) AS row_number_desc
                    FROM events
                    WHERE workflow_id = :workflowId
                        AND event_template_id = :eventTemplateId
                ) subquery
            WHERE row_number_asc > 1
                AND row_number_desc > 2
        ) to_delete
      WHERE e.id = to_delete.id`,
      {
        raw: true,
        replacements: { workflowId, eventTemplateId },
        type: this.db.QueryTypes.DELETE,
      },
    );
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
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      dueDate: item.due_date,
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
      due_date: item.dueDate,
    };
  }
}

module.exports = EventModel;
