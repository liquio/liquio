const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentTemplateEntity = require('../entities/document_template');
const beautifyJSON = require('../lib/beautifyJSON');
const { parseJSONCSchema, validateJSONCSchema } = require('../lib/jsonc_helper');

class DocumentTemplateModel extends Model {
  constructor(dbInstance) {
    if (!DocumentTemplateModel.singleton) {
      super(dbInstance);

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

      this.model.prototype.prepareEntity = this.prepareEntity;

      DocumentTemplateModel.singleton = this;
    }

    return DocumentTemplateModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<DocumentTemplateEntity[]>}
   */
  async getAll() {
    const documentTemplates = await this.model.findAll({
      include: [{ model: models.taskTemplate.model, attributes: ['id', 'name'] }],
      attributes: ['id', 'name'],
    });

    const documentTemplatesEntities = documentTemplates.map((item) => {
      let documentTemplate = this.prepareEntity(item);
      let taskTemplate = models.taskTemplate.prepareEntity(item.taskTemplate);
      documentTemplate.taskTemplate = taskTemplate;
      return documentTemplate;
    });

    return documentTemplatesEntities;
  }

  /**
   * Get all access JSON schemas.
   * @returns {Promise<{documentTemplateId, accessJsonSchema}[]>}
   */
  async getAllAccessJsonSchemas() {
    const documentTemplatesRaw = await this.model.findAll({
      attributes: ['id', 'access_json_schema'],
    });

    const documentTemplatesInfo = documentTemplatesRaw.map((item) => ({
      documentTemplateId: item.id,
      accessJsonSchema: item.access_json_schema,
    }));
    return documentTemplatesInfo;
  }

  /**
   * Find by ID.
   * @param {number} id Document template ID.
   * @returns {Promise<DocumentTemplateEntity>}
   */
  async findById(id) {
    const documentTemplate = await this.model.findByPk(id);

    const documentTemplateEntity = this.prepareEntity(documentTemplate);

    return documentTemplateEntity;
  }

  /**
   * Create document template.
   * @param {DocumentTemplateEntity} documentTemplateEntity Document template entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<array>}
   */
  async create(documentTemplateEntity, transaction) {
    if (!(documentTemplateEntity instanceof DocumentTemplateEntity)) {
      throw new Error('Must be instance of DocumentTemplateEntity');
    }

    const [data] = await this.model.upsert(this.prepareForModel(documentTemplateEntity), {
      returning: true,
      transaction,
    });

    return this.prepareEntity(data);
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @param {any} transaction Transaction.
   * @returns {Promise<number}
   */
  async deleteById(id, transaction) {
    return await this.model.destroy({
      where: { id },
      transaction,
    });
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
      jsonSchema: parseJSONCSchema(item.json_schema),
      jsonSchemaRaw: beautifyJSON(item.json_schema),
      htmlTemplate: item.html_template,
      accessJsonSchema: item.access_json_schema,
      additionalDataToSign: item.additional_data_to_sign,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {DocumentTemplateEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    if (item.jsonSchemaRaw) {
      validateJSONCSchema(item.jsonSchemaRaw);
    }

    return {
      id: item.id,
      name: item.name,
      json_schema: item.jsonSchemaRaw || JSON.stringify(item.jsonSchema),
      html_template: item.htmlTemplate,
      access_json_schema: item.accessJsonSchema,
      additional_data_to_sign: item.additionalDataToSign,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = DocumentTemplateModel;
