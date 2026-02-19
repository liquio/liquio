const Sequelize = require('sequelize');
const jsoncParser = require('jsonc-parser');

const Model = require('./model');
const DocumentTemplateEntity = require('../entities/document_template');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 300; // 5 minutes

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
            defaultValue: {}
          },
          additional_data_to_sign: Sequelize.TEXT
        },
        {
          tableName: 'document_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      PgPubSub.getInstance().subscribe('document_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache.documentTemplate?.findById || DEFAULT_CACHE_TTL,
        substituteJsonProps: global.config.cache.documentTemplate?.substituteJsonProps || DEFAULT_CACHE_TTL
      };

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
      attributes: ['id', 'name']
    });

    const documentTemplatesEntities = documentTemplates.map(item => {
      const documentTemplate = this.prepareEntity(item);
      const taskTemplate = models.taskTemplate.prepareEntity(item.taskTemplate);
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
      attributes: ['id', 'access_json_schema']
    });

    const documentTemplatesInfo = documentTemplatesRaw.map(item => ({
      documentTemplateId: item.id,
      accessJsonSchema: item.access_json_schema
    }));
    return documentTemplatesInfo;
  }

  /**
   * Get access JSON schemas by IDs.
   * @returns {Promise<{documentTemplateId, accessJsonSchema}[]>}
   */
  async getAccessJsonSchemasByIds(ids) {
    const documentTemplatesRaw = await this.model.findAll({
      where: { id: ids },
      attributes: ['id', 'access_json_schema']
    });

    return documentTemplatesRaw.map(item => ({
      documentTemplateId: item.id,
      accessJsonSchema: item.access_json_schema
    }));
  }

  /**
   * Find by ID.
   * @param {number} id Document template ID.
   * @returns {Promise<DocumentTemplateEntity>}
   */
  async findById(id) {
    const { data: documentTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('document_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById
    );

    const documentTemplateEntity = this.prepareEntity(documentTemplate);
    const substitutedDocumentTemplate = await this.substituteJsonProps(documentTemplateEntity);

    return substitutedDocumentTemplate;
  }

  /**
   * Substitute prop in jsonSchema from other template after prepareEntity!
   * @private
   * @param {DocumentTemplateEntity} documentTemplate Document template.
   * @returns {Promise<DocumentTemplateEntity>}
   */
  async substituteJsonProps(documentTemplate) {
    const { jsonSchema } = documentTemplate || {};
    const { properties } = jsonSchema || {};
    if (!properties) return documentTemplate;

    // find all documentWithId in jsonSchema
    const documentWithIds = [];
    for (const prop in properties) {
      const importProp = properties[prop].import;
      if (!importProp) continue;
      if (typeof importProp === 'string' && (/document.(\d+)/.test(importProp))) {
        const documentTemplateId = Number(importProp.split('.')[1]);
        documentWithIds.push(documentTemplateId) ;
      } else if (Array.isArray(importProp)) {
        importProp.forEach(ip => {
          if (typeof ip === 'string' && (/document.(\d+)/.test(ip))) {
            const documentTemplateId = Number(ip.split('.')[1]);
            documentWithIds.push(documentTemplateId);
          }
        });
      }
    }

    const documentTemplateMap = new Map();
    const templates = await this.model.findAll({ where: { id: documentWithIds } });
    for (const template of templates) {
      documentTemplateMap.set(`${template.id}`, template);
    }

    // find template by documentWithId and property key name. return found object or empty object
    const getPropertiesByDocument = key => async documentWithId => {
      if (!(typeof documentWithId === 'string' && (/document.(\d+)/.test(documentWithId)))) {
        throw new Error(`Passed incorrect value to import - "${documentWithId}" while importing step "${key}"`);
      }
      const documentTemplateId = documentWithId.split('.')[1];

      const documentTemplate = documentTemplateMap.get(documentTemplateId);
      if (!documentTemplate) {
        throw new Error(`Cannot find document by ${documentTemplateId}. Trying to substitute by (properties.${key}.import = document.${documentTemplateId}).`);
      }
      let jsonSchema;
      try {
        jsonSchema = jsoncParser.parse(documentTemplate.json_schema);
      } catch (error) {
        log.save('substitute-json-schema-parse-error', error.toString(), 'error');
        throw new Error(`Cannot parse JSON schema from document ${documentTemplateId}. Trying to substitute by (properties.${key}.import = document.${documentTemplateId}).`, { cause: error });
      }

      if (!jsonSchema.properties?.[key]) {
        throw new Error(`Cannot get property (properties.${key}) from document ${documentTemplateId}. Trying to substitute by (properties.${key}.import = document.${documentTemplateId}).`);
      }

      return jsonSchema.properties[key];
    };

    // update jsonSchema.properties[key] with imported values
    const processProperties = async key => {
      const importProp = properties[key].import;
      if (importProp === undefined || importProp === null) return;

      const result = await Promise.all([].concat(importProp).map(getPropertiesByDocument(key)));
      const concatedResult = result.reduce((acc, cur) => ({ ...cur, ...acc }), {});

      // if all objects in array has `properties` key, concat them
      if (result.every(item => item.properties)) {
        concatedResult.properties = result.map(item => item.properties).reduce((acc, cur) => ({ ...cur, ...acc }), {});
      }

      jsonSchema.properties[key] = concatedResult;
    };

    await Promise.all(Object.keys(properties).map(processProperties));

    documentTemplate.jsonSchema = jsonSchema;
    return documentTemplate;
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
      additionalDataToSign: item.additional_data_to_sign
    });
  }

  /**
   * Invalidate cache on row change.
   * @private
   * @param {string} channel Channel.
   * @param {NotifyData} data Data.
   *
   * @typedef {Object} NotifyData
   * @property {number} id Row ID.
   * @property {'INSERT' | 'UPDATE' | 'DELETE'} action Action.
   * @property {string} table Table name.
   */
  onRowChange(channel, { id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('document_template', 'findById', id));
      redis.deleteMany(RedisClient.createKey('document_template', 'substituteJsonProps', '*'));
    }
  }
}

module.exports = DocumentTemplateModel;
