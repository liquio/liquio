const Sequelize = require('sequelize');
const Model = require('./model');
const WorkflowModel = require('./workflow');
const EventEntity = require('../entities/event');

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

      const workflowModel = new WorkflowModel();
      this.workflowModel = workflowModel;
      this.model.belongsTo(workflowModel.model, { foreignKey: 'workflow_id', targetKey: 'id' });

      EventModel.singleton = this;
    }

    return EventModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<EventEntity>}
   */
  async findById(id) {
    const event = await this.model.findByPk(id);
    if (!event) {
      return;
    }

    const workflow = await event.getWorkflow();
    if (!workflow) {
      return;
    }

    const eventEntity = this.prepareEntity(event);
    eventEntity.workflowEntity = this.workflowModel.prepareEntity(workflow);

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
