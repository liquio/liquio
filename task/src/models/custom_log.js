
const Sequelize = require('sequelize');
const Model = require('./model');
const CustomLogEntity = require('../entities/custom_log');
const { SequelizeDbError } = require('../lib/errors');

/**
 * Custom log template model.
 */
class CustomLogModel extends Model {
  /**
   * Custom log template model constructor.
   */
  constructor() {
    // Singleton.
    if (!CustomLogModel.singleton) {
      // Call parent constructor.
      super();

      // Sequelize model.
      this.model = this.db.define(
        'custom_logs',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1
          },
          custom_log_template_id: {
            allowNull: true,
            type: Sequelize.INTEGER,
            references: { model: 'custom_log_templates', key: 'id' }
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING
          },
          type: {
            allowNull: false,
            type: Sequelize.STRING
          },
          document_id: {
            allowNull: true,
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' }
          },
          request_id: {
            allowNull: true,
            type: Sequelize.STRING
          },
          method: {
            allowNull: true,
            type: Sequelize.STRING
          },
          url: {
            allowNull: true,
            type: Sequelize.STRING
          },
          uri_pattern: {
            allowNull: true,
            type: Sequelize.STRING
          },
          ip: {
            allowNull: true,
            type: Sequelize.ARRAY(Sequelize.STRING),
            defaultValue: []
          },
          user_agent: {
            allowNull: true,
            type: Sequelize.TEXT
          },
          user_id: {
            allowNull: true,
            type: Sequelize.STRING
          },
          user_name: {
            allowNull: true,
            type: Sequelize.STRING
          },
          custom: {
            allowNull: false,
            type: Sequelize.JSONB,
            defaultValue: {}
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE
          }
        },
        {
          tableName: 'custom_logs',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;

      // Define singleton.
      CustomLogModel.singleton = this;
    }

    // Return singleton.
    return CustomLogModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<CustomLogEntity[]>} Custom log entities promise.
   */
  async getAll() {
    // DB query.
    const raw = await this.model.findAll({
      sort: [['created_at', 'asc']]
    });

    // Return entities.
    const entities = raw.map(this.prepareEntity);
    return entities;
  }

  /**
   * Create.
   * @param {object} data Custom log object.
   * @param {string} data.id ID.
   * @param {number} [data.customLogTemplateId] Custom log template ID.
   * @param {string} data.name Name. Sample: `Подача звіту до НАЗК`.
   * @param {string} data.type Type. Sample: `Відкриття документу на читання`.
   * @param {string} [data.documentId] Document ID.
   * @param {string} [data.requestId] Request ID.
   * @param {string} [data.method] Request method.
   * @param {string} [data.url] Request URL.
   * @param {string} [data.uriPattern] Request URI pattern.
   * @param {string[]} [data.ip] Request IP.
   * @param {string} [data.userAgent] Request user agent.
   * @param {string} [data.userId] Request user ID.
   * @param {string} [data.userName] Request user name.
   * @param {object} data.custom Custon fields. Sample: `{ someProperty: { name, value }, ... }`.
   * @returns {Promise<CustomLogEntity>} Custom log entity promise.
   */
  async create(data) {
    // DB query.
    const preparedForModel = this.prepareForModel(data);
    let raw;
    try {
      raw = await this.model.create(preparedForModel);
    } catch (error) {
      throw new SequelizeDbError(error);
    }

    // Return entity.
    const entity = new CustomLogEntity(raw);
    return entity;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {CustomLogEntity} Custom log entity.
   */
  prepareEntity(item) {
    return new CustomLogEntity({
      id: item.id,
      customLogTemplateId: item.custom_log_template_id,
      name: item.name,
      type: item.type,
      documentId: item.document_id,
      requestId: item.request_id,
      method: item.method,
      url: item.url,
      uriPattern: item.uri_pattern,
      ip: item.ip,
      userAgent: item.user_agent,
      userId: item.user_id,
      userName: item.user_name,
      custom: item.custom,
      defaultValue: item.defaultValue,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  }

  /**
   * Prepare for model.
   * @param {TaskEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      custom_log_template_id: item.customLogTemplateId,
      name: item.name,
      type: item.type,
      document_id: item.documentId,
      request_id: item.requestId,
      method: item.method,
      url: item.url,
      uri_pattern: item.uriPattern,
      ip: item.ip,
      user_agent: item.userAgent,
      user_id: item.userId,
      user_name: item.userName,
      custom: item.custom,
      defaultValue: item.defaultValue,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    };
  }
}

module.exports = CustomLogModel;
