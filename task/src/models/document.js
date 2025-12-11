const Sequelize = require('sequelize');
const Model = require('./model');
const DocumentEntity = require('../entities/document');
const RedisClient = require('../lib/redis_client');

// Constants.
const SYSTEM_USER = 'system';
const GET_ALL_BY_WORKFLOW_ID_CACHE_TTL = 600; // 10 minutes.

class DocumentModel extends Model {
  constructor() {
    if (!DocumentModel.singleton) {
      super();

      this.model = this.db.define(
        'document',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          external_id: Sequelize.STRING,
          parent_id: Sequelize.UUID,
          document_template_id: {
            type: Sequelize.INTEGER,
            references: { model: 'document_templates', key: 'id' }
          },
          document_state_id: Sequelize.INTEGER,
          cancellation_type_id: Sequelize.INTEGER,
          number: Sequelize.STRING,
          is_final: Sequelize.BOOLEAN,
          owner_id: Sequelize.INTEGER,
          created_by: Sequelize.STRING,
          updated_by: Sequelize.STRING,
          data: Sequelize.JSON,
          description: Sequelize.STRING,
          file_id: Sequelize.STRING,
          file_name: Sequelize.STRING,
          file_type: Sequelize.STRING,
          file_size: Sequelize.INTEGER,
          asic: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {
              asicmanifestFileId: null,
              filesIds: []
            }
          }
        },
        {
          tableName: 'documents',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      this.model.prototype.prepareEntity = this.prepareEntity;

      DocumentModel.singleton = this;
    }

    return DocumentModel.singleton;
  }

  /**
   * Find by ID.
   * @param {string} id Document ID.
   * @param {boolean} includeTask Include task data.
   * @param {boolean} includeTaskTemplate Include task template.
   * @returns {Promise<DocumentEntity>}
   */
  async findById(id, includeTask = false, includeTaskTemplate = false) {
    const document = await this.model.findByPk(id, {
      include: [{ model: models.task.model, required: includeTask }]
    });

    if (!document) { return; }

    let documentEntity = await this.prepareEntity(document);

    if (document.task) {
      documentEntity.task = document.task.prepareEntity(document.task);
      if (includeTaskTemplate && !(documentEntity.task.taskTemplate?.jsonSchema)) {
        documentEntity.task.taskTemplate = await models.taskTemplate.findById(document.task.task_template_id);
      }
    }


    return documentEntity;
  }

  /**
   * Get by IDs list.
   * @param {string[]} ids Document IDs list.
   * @returns {Promise<DocumentEntity[]>} Promise of documents list.
   */
  async getByIds(ids) {
    const documents = await this.model.findAll({ where: { id: ids } });
    return Promise.all(documents.map(item => this.prepareEntity(item)));
  }

  /**
   * Check exists.
   * @param {number} documentTemplateId Document template ID.
   * @param {boolean} isFinal Is final indicator.
   * @param {Date} updatedAtFrom Updated from date.
   * @returns {Promise<boolean>} Is exists indicator promise.
   */
  async checkExists(documentTemplateId, isFinal, updatedAtFrom) {
    const rawDocument = await this.model.findOne({
      where: {
        document_template_id: documentTemplateId,
        is_final: isFinal,
        updated_at: { [Sequelize.Op.gte]: updatedAtFrom }
      },
      attributes: ['id', 'document_template_id', 'is_final', 'updated_at']
    });

    const exists = !!rawDocument;

    return exists;
  }

  /**
   * Get by external ID.
   * @param {string} externalId External ID.
   * @returns {Promise<DocumentEntity>} Promise of document.
   */
  async getByExternalId(externalId) {
    const rawDocument = await this.model.findOne({ where: { external_id: externalId } });

    if (!rawDocument) {
      return;
    }

    const document = await this.prepareEntity(rawDocument);
    return document;
  }

  /**
   * @param {string} externalId
   * @return {Promise<boolean>}
   */
  async isExternalIdExists(externalId) {
    const documentId = await this.model.findOne({ attributes: ['id'], raw: true, where: { external_id: externalId } });

    return !!documentId;
  }

  /**
   * Get files names.
   * @param {string[]} ids Document IDs list.
   * @returns {Promise<{documentId, documentTemplateId, fileName}[]>} Promise of documents file names info list.
   */
  async getFilesNamesByIds(ids) {
    const documents = await this.model.findAll({
      where: { id: ids, is_final: true },
      attributes: ['id', 'document_template_id', 'file_id', 'file_name', 'file_size', 'created_at', 'updated_at']
    });

    return documents.map(item => ({
      documentId: item.id,
      documentTemplateId: item.document_template_id,
      fileId: item.file_id,
      fileName: item.file_name,
      fileSize: item.file_size,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  }

  /**
   * Create document.
   * @param {object} data Data object.
   * @param {string} data.parentId Document parent ID.
   * @param {number} data.documentTemplateId Document template ID.
   * @param {string} data.userId User ID.
   * @param {string} data.number Generated unique number.
   * @returns {Promise<DocumentEntity>}
   */
  async create({ parentId, documentTemplateId, userId, number }) {
    const document = this.prepareForModel({
      parentId,
      documentTemplateId,
      documentStateId: 1,
      ownerId: userId || SYSTEM_USER,
      createdBy: userId || SYSTEM_USER,
      updatedBy: userId || SYSTEM_USER,
      data: {},
      number
    });

    const rawDbResponse = await this.model.create(document);

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Update data.
   * @param {string} id Document ID.
   * @param {string} userId User ID.
   * @param {object} data Data users.
   * @param {boolean} [clearGeneratedFile] Clear generated file indicator. Default value: `false`.
   * @param {boolean} [isKeepDocumentFile]
   * @returns {Promise<DocumentEntity>} Document entity promise.
   */
  async updateData(id, userId, data, clearGeneratedFile = false, isKeepDocumentFile = false) {
    const document = this.prepareForModel({ data: data, updatedBy: userId });
    if (clearGeneratedFile && !isKeepDocumentFile) {
      document.file_id = null;
      document.file_name = null;
      document.file_type = null;
      document.file_size = null;
    }
    const [, updatedDocument] = await this.model.update(document, {
      where: { id: id },
      returning: true
    });

    if (updatedDocument.length === 1) {
      return this.prepareEntity(updatedDocument[0]);
    }
  }

  /**
   * Add document file.
   * @param {object} data Data.
   * @param {string} data.id Document ID.
   * @param {string} data.updatedBy User ID.
   * @param {string} data.fileId File id.
   * @param {string} data.fileName File name.
   * @param {string} data.fileType File type.
   */
  async addDocumentFile({ id, updatedBy, fileId, fileName, fileType, fileSize }) {
    const document = this.prepareForModel({ updatedBy, fileId, fileName, fileType, fileSize });
    const dbResponse = await this.model.update(document, { where: { id: id } });

    return dbResponse;
  }

  /**
   * Set status final.
   * @param {string} id Document ID.
   */
  async setStatusFinal(id) {
    const documentEntity = await this.findById(id);

    await this.model.update({
      is_final: true,
      data: documentEntity.data
    }, { where: { id } });
  }

  /**
   * Set ASIC info.
   * @param {string} id Document ID.
   * @param {{asicmanifestFileId, filesIds}} asic ASIC info.
   */
  async setAsicInfo(id, asic) {
    await this.model.update({ asic }, { where: { id } });
  }

  /**
   * Set external ID.
   * @param {string} id Document ID.
   * @param {string} externalId External ID.
   */
  async setExternalId(id, externalId) {
    const dbResponse = await this.model.update({ external_id: externalId }, { where: { id } });

    return dbResponse;
  }

  /**
   * Delete by ID.
   * @param {string} id ID.
   * @returns {Promise<number>}
   */
  async deleteById(id) {
    await this.model.destroy({ where: { id } });
  }

  /**
   * Get all documents by workflowId.
   * @param {Object} params
   * @param {string} params.workflowId
   * @param {string} params.order
   * @return {Promise<DocumentEntity>}
   */
  async getAllByWorkflowId({ workflowId, order = 'desc' }) {
    const { data: documents } = await RedisClient.getOrSetWithTimestamp(
      RedisClient.createKey('document', 'getAllByWorkflowId', workflowId, order),
      async () => this.getTimestampByWorkflowId(workflowId),
      async () => this.model.findAll({
        include: [{ model: global.models.task.model, where: { workflow_id: workflowId } }],
        order: [['created_at', order]]
      }),
      GET_ALL_BY_WORKFLOW_ID_CACHE_TTL,
    );

    const entities = [];
    for (const item of documents) {
      const document = await this.prepareEntity(item);
      if (item.task) {
        document.task = global.models.task.prepareEntity(item.task);
      }
      entities.push(document);
    }

    return entities;
  }

  /**
   * Timestamp workflow documents
   * @param {string} workflowId
   * @return {Promise<string>} Timestamp
   */
  async getTimestampByWorkflowId(workflowId) {
    const [{ maxTimestamp }] = await this.db.query(
      `
        select
          max(d.updated_at) as "maxTimestamp"
        from documents d
        left join tasks t on t.document_id = d.id
        where t.workflow_id = :workflowId
      `,
      {
        replacements: { workflowId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return maxTimestamp;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @param {object} documentTemplate Document template.
   * @returns {DocumentEntity}
   */
  async prepareEntity(item) {
    const docTemplate = await models.documentTemplate.findById(item.document_template_id);

    const newDocumentEntity = new DocumentEntity({
      id: item.id,
      externalId: item.external_id,
      parentId: item.parent_id,
      documentTemplateId: item.document_template_id,
      documentStateId: item.document_state_id,
      cancellationTypeId: item.cancellation_type_id,
      number: item.number,
      isFinal: item.is_final,
      ownerId: item.owner_id,
      createdBy: item.created_by,
      updatedBy: item.updated_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      data: item.data,
      description: item.description,
      fileId: item.file_id,
      fileName: item.file_name,
      fileType: item.file_type,
      asic: item.asic,
      documentTemplate: docTemplate,
      fileSize: item.file_size
    });

    newDocumentEntity.calcGetters();

    return newDocumentEntity;
  }

  /**
   * Prepare for model.
   * @param {DocumentEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      external_id: item.externalId,
      parent_id: item.parentId,
      document_template_id: item.documentTemplateId,
      document_state_id: item.documentStateId,
      cancellation_type_id: item.cancellationTypeId,
      number: item.number,
      is_final: item.isFinal,
      owner_id: item.ownerId,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
      data: item.data,
      description: item.description,
      file_id: item.fileId,
      file_name: item.fileName,
      file_type: item.fileType,
      file_size: item.fileSize,
      asic: item.asic
    };
  }
}

module.exports = DocumentModel;
