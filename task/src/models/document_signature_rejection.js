const Sequelize = require('sequelize');
const Model = require('./model');
const DocumentSignatureRejectionEntity = require('../entities/document_signature_rejection');

class DocumentSignatureRejectionModel extends Model {
  constructor() {
    // Singleton.
    if (!DocumentSignatureRejectionModel.singleton) {
      // Call parent constructor.
      super();

      // Define params.
      this.model = this.db.define(
        'documentSignatureRejection',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1
          },
          document_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' }
          },
          user_id: {
            allowNull: false,
            type: Sequelize.TEXT
          },
          data: {
            allowNull: false,
            type: Sequelize.JSON
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING
          }
        },
        {
          tableName: 'document_signature_rejections',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      // Init singleton.
      DocumentSignatureRejectionModel.singleton = this;
    }

    // Return singleton.
    return DocumentSignatureRejectionModel.singleton;
  }

  /**
   * Get by document ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<DocumentSignatureRejectionEntity[]>} Document signature rejections list promise.
   */
  async getByDocumentId(documentId) {
    // Get record.
    const documentSignatureRejections = await this.model.findAll({ where: { document_id: documentId } });

    // Convert to entities.
    const documentSignaturesEntities = documentSignatureRejections.map(item => {
      return this.prepareEntity(item);
    });

    return documentSignaturesEntities;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} data.documentId Document ID.
   * @param {number} data.userId User ID.
   * @param {string} data.data Data.
   * @param {string} data.createdBy Created by user ID.
   * @returns {Promise<DocumentSignatureRejectionEntity>} Created document signature rejection entity promise.
   */
  async create({ documentId, userId, data, createdBy }) {
    // Prepare record.
    const signatureRejectionModel = this.prepareForModel({ documentId, userId, data, createdBy });

    // Create record.
    const createdSignatureRejection = await this.model.create(signatureRejectionModel);

    // Return entity.
    return this.prepareEntity(createdSignatureRejection);
  }

  /**
   * Delete by document ID and user ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<number>}
   */
  async deleteByDocumentIdAndUserId(documentId, userId) {
    await this.model.destroy({ where: { document_id: documentId, user_id: userId } });
  }

  /**
   * Delete by document ID.
   * @param {string} documentId Document ID.
   * @returns {Promise<number>}
   */
  async deleteByDocumentId(documentId) {
    await this.model.destroy({ where: { document_id: documentId } });
  }

  /**
   * Prepare entity.
   * @param {object} item Record.
   * @returns {DocumentSignatureRejectionEntity} Entity.
   */
  prepareEntity(item) {
    return new DocumentSignatureRejectionEntity({
      id: item.id,
      documentId: item.document_id,
      userId: item.user_id,
      data: item.data,
      createdAt: item.created_at,
      createdBy: item.created_by
    });
  }

  /**
   * Prepare for model.
   * @param {DocumentSignatureRejectionEntity} item Entity.
   * @returns {object} Record.
   */
  prepareForModel(item) {
    return {
      document_id: item.documentId,
      user_id: item.userId,
      data: item.data,
      created_at: item.createdAt,
      created_by: item.createdBy
    };
  }
}

module.exports = DocumentSignatureRejectionModel;
