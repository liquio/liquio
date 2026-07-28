const Sequelize = require('sequelize');
const Model = require('./model');
const EventEntity = require('../entities/event');

const DELAY_TYPE = 2;
const NOTIFICATION_TYPE = 1;

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
          due_date: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          version: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          lock_id: {
            allowNull: true,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'events',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      EventModel.singleton = this;
    }

    return EventModel.singleton;
  }

  /**
   * @param {string} workflowId Workflow ID.
   * @param {number} eventTemplateId Event template ID.
   * @returns {Promise<EventEntity[]>} Event entities list promise.
   */
  async getLastByWorkflowIdAndTemplateId(workflowId, eventTemplateId) {
    const event = await this.model.findOne({
      where: {
        workflow_id: workflowId,
        event_template_id: eventTemplateId,
      },
      order: [['created_at', 'desc']],
    });

    return this.prepareEntity(event || {});
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
   * Lock running events.
   * @param {string} lockId Lock ID.
   */
  async lockRunningEvents(lockId) {
    return await this.model.update(
      {
        lock_id: lockId,
      },
      {
        where: {
          event_type_id: DELAY_TYPE,
          done: false,
          [Sequelize.Op.and]: Sequelize.literal('due_date <= now()'),
          lock_id: null,
        },
      },
    );
  }

  /**
   * Unlock old locked events (1 hour).
   */
  async unlockOldLockedEvents() {
    return await this.model.update(
      {
        lock_id: null,
      },
      {
        where: {
          event_type_id: DELAY_TYPE,
          done: false,
          [Sequelize.Op.and]: Sequelize.literal('due_date < (now() - interval \'1 hour\')'),
          lock_id: {
            [Sequelize.Op.ne]: null,
          },
        },
      },
    );
  }

  /**
   * Get running events.
   * @param {string} [lockId] Lock ID.
   * @returns {Promise<EventEntity[]>}
   */
  async getRunningEvents(lockId) {
    const where = {
      event_type_id: DELAY_TYPE,
      done: false,
      [Sequelize.Op.and]: Sequelize.literal('due_date <= now()'),
    };
    if (typeof lockId !== 'undefined') {
      where.lock_id = lockId;
    }
    const events = await this.model.findAll({
      where,
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
        [Sequelize.Op.and]: [Sequelize.literal('due_date <= now()')],
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
   * @param {string} data.dueDate Due date.
   * @param {string} data.version Version.
   * @returns {Promise<EventEntity>} Created event entity promise.
   */
  async create({ eventTemplateId, eventTypeId, workflowId, name, createdBy, updatedBy, data, done, documentId, dueDate, version }) {
    // Prepare event record.
    const event = this.prepareForModel({
      eventTemplateId,
      eventTypeId,
      workflowId,
      name,
      createdBy,
      updatedBy,
      data,
      done,
      documentId,
      dueDate,
      version,
    });

    // Create and return event.
    const createdEvent = await this.model.create(event);

    // Return created event.
    return this.prepareEntity(createdEvent);
  }

  /**
   * Update.
   * @param {string} id ID.
   * @param {object} data Data.
   * @returns {Promise<EventEntity>} Updated event entity promise.
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
      dueDate: item.due_date,
      version: item.version,
      lockId: item.lock_id,
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
      version: item.version,
      lock_id: item.lockId,
    };
  }
}

module.exports = EventModel;
