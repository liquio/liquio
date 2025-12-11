const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentTemplateEntity = require('../entities/document_template');
const RedisClient = require('../lib/redis_client');

class DocumentTemplateModel extends Model {
  constructor() {
    if (!DocumentTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'documentTemplate',
        {
          name: Sequelize.STRING,
          json_schema: Sequelize.TEXT,
          html_template: Sequelize.TEXT,
          access_json_schema: {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: {},
          },
          additional_data_to_sign: Sequelize.TEXT,
        },
        {
          tableName: 'document_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      this.cacheTtl = {
        findByIdCached: global.config.cache?.documentTemplate?.findByIdCached || 60, // 1 minute
      };

      DocumentTemplateModel.singleton = this;
    }

    return DocumentTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id Document template ID.
   * @returns {Promise<DocumentTemplateEntity>}
   */
  async findById(id) {
    const documentTemplate = await this.model.findByPk(id);

    return this.prepareEntity(documentTemplate);
  }

  /**
   * Find by ID cached.
   * @param {number} id
   * @returns {Promise<DocumentTemplateEntity>}
   */
  async findByIdCached(id) {
    const { data } = await RedisClient.getOrSet(
      RedisClient.createKey('document_template', 'findByIdCached', id),
      () => this.findById(id),
      this.cacheTtl.findByIdCached,
    );
    return data;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {DocumentTemplateEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new DocumentTemplateEntity({
      id: item.id,
      name: item.name,
      jsonSchema: item.json_schema,
      htmlTemplate: item.html_template,
      accessJsonSchema: item.access_json_schema,
      additionalDataToSign: item.additional_data_to_sign,
    });
  }
}

module.exports = DocumentTemplateModel;
