const Sequelize = require('sequelize');
const Model = require('./model');
const DocumentSignatureEntity = require('../entities/document_signature');

class DocumentSignatureModel extends Model {
  constructor() {
    if (!DocumentSignatureModel.singleton) {
      super();

      this.model = this.db.define(
        'documentSignature',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          document_id: {
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' }
          },
          signature: Sequelize.TEXT,
          type: Sequelize.STRING,
          certificate: Sequelize.TEXT,
          created_by: Sequelize.STRING
        },
        {
          tableName: 'document_signatures',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      DocumentSignatureModel.singleton = this;
    }

    return DocumentSignatureModel.singleton;
  }

  /**
   * Get by document ID.
   * @param {string} documentId Document ID.
   * @param {string} createdBy Created by.
   * @param {Array<string>} [attributes] Sequelize attributes option.
   * @param {Array<string>} [order] Sequelize order option.
   * @returns {Promise<DocumentSignatureEntity[]>} Document signatures list promise.
   */
  async getByDocumentId(documentId, createdBy, attributes, order) {
    const options = {
      where: {
        document_id: documentId
      }
    };

    if (createdBy) {
      options.where.created_by = createdBy;
    }

    if (attributes?.length) {
      options.attributes = attributes;
    }

    if (order?.length) {
      options.order = order;
    }

    // Get signatures.
    const documentSignature = await this.model.findAll(options);

    // Convert to entities.
    const documentSignaturesEntities = documentSignature.map(item => {
      return this.prepareEntity(item);
    });

    return documentSignaturesEntities;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {number} data.documentId Document ID.
   * @param {number} data.signature Signature.
   * @param {string} data.type Signature type.
   * @param {string} data.certificate Certificate.
   * @param {string} data.createdBy Created by user ID.
   * @returns {Promise<DocumentSignatureEntity>} Created document signature entity promise.
   */
  async create({ documentId, signature, type, certificate, createdBy }) {
    // Prepare signature record.
    const signatureModel = this.prepareForModel({ documentId, signature, type, certificate, createdBy });

    // Create and return signature.
    const createdSignature = await this.model.create(signatureModel);

    // Return created signature.
    return this.prepareEntity(createdSignature);
  }

  /**
   * Delete by document ID.
   * @param {string} documentId Document ID.
   */
  async deleteByDocumentId(documentId) {
    await this.model.destroy({ where: { document_id: documentId } });
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {DocumentSignatureEntity}
   */
  prepareEntity(item) {
    return new DocumentSignatureEntity({
      id: item.id,
      documentId: item.document_id,
      signature: item.signature,
      type: item.type,
      certificate: item.certificate,
      createdBy: item.created_by,
      createdAt: item.created_at
    });
  }

  /**
   * Prepare for model.
   * @param {DocumentSignatureEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      document_id: item.documentId,
      signature: item.signature,
      type: item.type,
      certificate: item.certificate,
      created_by: item.createdBy
    };
  }
}

module.exports = DocumentSignatureModel;
