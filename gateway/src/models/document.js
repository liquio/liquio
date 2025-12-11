const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentEntity = require('../entities/document');

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
            references: { model: 'document_templates', key: 'id' },
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
          file_name: Sequelize.STRING,
          file_type: Sequelize.STRING,
        },
        {
          tableName: 'documents',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      DocumentModel.singleton = this;
    }

    return DocumentModel.singleton;
  }

  /**
   * Find by ID.
   * @param {string} id
   * @returns {Promise<DocumentEntity>}
   */
  async findById(id) {
    const document = await this.model.findByPk(id);
    if (!document) {
      return;
    }

    return this.prepareEntity(document);
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {DocumentEntity}
   */
  prepareEntity(item) {
    return new DocumentEntity({
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
      fileName: item.file_name,
      fileType: item.file_type,
      attachments: item.attachments,
    });
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
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      data: item.data,
      description: item.description,
      file_name: item.fileName,
      file_type: item.fileType,
    };
  }
}

module.exports = DocumentModel;
