const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentEntity = require('../entities/document');
const { SYSTEM_USER } = require('../constants/common');

/**
 * Document model.
 */
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
          file_id: Sequelize.STRING,
          file_name: Sequelize.STRING,
          file_type: Sequelize.STRING,
          asic: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {
              asicmanifestFileId: null,
              filesIds: [],
            },
          },
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
   * @returns {Promise<DocumentEntity>} Document entity promise.
   */
  async findById(id) {
    const document = await this.model.findByPk(id);
    if (!document) {
      return;
    }

    return this.prepareEntity(document);
  }

  /**
   * Set cancelled.
   * @param {string|string[]} id Document ID or ID list.
   */
  async setCancelled(id) {
    await this.model.update({ cancellation_type_id: 1, is_final: true }, { where: { id } });
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
   * Create document.
   * @param {object} data Data object.
   * @param {string} data.parentId Document parent ID.
   * @param {number} data.documentTemplateId Document template ID.
   * @param {string} data.userId User ID.
   * @param {string} data.number Generated unique number.
   * @param {string} data.fileId File ID.
   * @param {string} data.fileName File name.
   * @param {string} data.fileType File type.
   * @param {boolean} data.isFinal Is final indicator.
   * @returns {Promise<DocumentEntity>}
   */
  async create({ parentId, documentTemplateId, userId, number, fileId, fileName, fileType, isFinal = true }) {
    const document = this.prepareForModel({
      parentId,
      documentTemplateId,
      documentStateId: 1,
      ownerId: userId || SYSTEM_USER,
      createdBy: userId || SYSTEM_USER,
      updatedBy: userId || SYSTEM_USER,
      data: {},
      number,
      fileId,
      fileName,
      fileType,
      isFinal,
    });

    const rawDbResponse = await this.model.create(document);

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Update data.
   * @param {string} id Document ID.
   * @param {object} data Data users.
   * @returns {Promise<DocumentEntity>} Document entity promise.
   */
  async updateData(id, data) {
    const document = this.prepareForModel({ data });

    const [, [updatedDocument]] = await this.model.update(document, {
      where: { id },
      returning: true,
    });

    if (!updatedDocument) {
      return;
    }

    return this.prepareEntity(updatedDocument);
  }

  /**
   * Set status final.
   * @param {string} id Document ID.
   */
  async setStatusFinal(id) {
    await this.model.update({ is_final: true }, { where: { id } });
  }

  /**
   * Clear file data (file_id, file_name, file_type).
   * @param {string} id Document ID.
   */
  async clearFileData(id) {
    await this.model.update({ file_id: null, file_name: null, file_type: null }, { where: { id } });
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
      fileId: item.file_id,
      fileName: item.file_name,
      fileType: item.file_type,
      asic: item.asic,
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
      data: item.data,
      description: item.description,
      file_id: item.fileId,
      file_name: item.fileName,
      file_type: item.fileType,
      asic: item.asic,
    };
  }
}

module.exports = DocumentModel;
