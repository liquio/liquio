const Sequelize = require('sequelize');

const Model = require('./model');
const CustomLogTemplateEntity = require('../entities/custom_log_template');

/**
 * Custom log template model.
 */
class CustomLogTemplateModel extends Model {
  /**
   * Custom log template model constructor.
   */
  constructor() {
    // Singleton.
    if (!CustomLogTemplateModel.singleton) {
      // Call parent constructor.
      super();

      // Sequelize model.
      this.model = this.db.define(
        'custom_log_templates',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER,
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          document_template_id: {
            allowNull: true,
            type: Sequelize.INTEGER,
            references: { model: 'document_templates', key: 'id' },
          },
          event_template_id: {
            allowNull: true,
            type: Sequelize.INTEGER,
            references: { model: 'event_templates', key: 'id' },
          },
          operation_type: {
            allowNull: false,
            type: Sequelize.ENUM,
            values: [
              'read-document',
              'create-document',
              'update-document',
              'delete-document',
              'add-attach',
              'remove-attach',
              'generate-pdf',
              'sign',
              'commit',
              'event-created',
            ],
          },
          schema: {
            allowNull: false,
            type: Sequelize.TEXT,
            defaultValue: '(entity) => { return { type: \'Unknown type\', custom: [] }; }',
          },
          is_get_workflow_data: {
            allowNull: true,
            type: Sequelize.BOOLEAN,
          },
        },
        {
          tableName: 'custom_log_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;

      // Cache params.
      this.cache = { createdAt: null, data: [] };

      // Define singleton.
      CustomLogTemplateModel.singleton = this;
    }

    // Return singleton.
    return CustomLogTemplateModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<CustomLogTemplateEntity[]>} Custom log templates entities promise.
   */
  async getAll() {
    // DB query.
    const raw = await this.model.findAll({
      sort: [['id', 'asc']],
    });

    // Return entities.
    const entities = raw.map(this.prepareEntity);
    return entities;
  }

  /**
   * Get all with cache.
   * @returns {Promise<CustomLogTemplateEntity[]>} Custom log templates entities promise.
   */
  async getAllWithCache() {
    // Check cache available.
    const { templatesCacheLifetime: cacheLifetime = 60000 } = global.config.custom_logs;
    const { createdAt: cacheCreatedAt, data: cacheData } = this.cache;
    const now = Date.now();
    if (cacheCreatedAt && now - cacheCreatedAt <= cacheLifetime) {
      return cacheData;
    }

    // Get all entities.
    const entities = await this.getAll();

    // Set cache.
    this.cache.data = entities;
    this.cache.createdAt = now;

    // Return entities.
    return entities;
  }

  /**
   * Get by operation type and event template ID.
   * @param {string} operationType Operation type.
   * @param {number} eventTemplateId Event template ID.
   * @returns {Promise<CustomLogTemplateEntity[]>} Custom log templates entities promise.
   */
  async getByOperationTypeAndEventTemplateIdWithCache(operationType, eventTemplateId) {
    // Get all entites with cache.
    const allEntities = await this.getAllWithCache();

    // Filter by template ID.
    const entities = allEntities.filter(
      (v) => v.operationType && v.operationType === operationType && (v.eventTemplateId === eventTemplateId || !v.eventTemplateId),
    );

    // Return entities.
    return entities;
  }

  /**
   * Get by operation type.
   * @param {string} operationType Operation type.
   * @returns {Promise<CustomLogTemplateEntity[]>} Custom log templates entities promise.
   */
  async getByOperationType(operationType) {
    // Get all entites with cache.
    const allEntities = await this.getAllWithCache();

    // Filter by template ID.
    const entities = allEntities.filter((v) => v.operationType && v.operationType === operationType);

    // Return entities.
    return entities;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {CustomLogTemplateEntity}
   */
  prepareEntity(item) {
    return new CustomLogTemplateEntity({
      id: item.id,
      name: item.name,
      documentTemplateId: item.document_template_id,
      eventTemplateId: item.event_template_id,
      operationType: item.operation_type,
      schema: item.schema,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isGetWorkflowData: item.is_get_workflow_data,
    });
  }
}

module.exports = CustomLogTemplateModel;
