const Sequelize = require('sequelize');

const Model = require('./model');
const DocumentSignatureEntity = require('../entities/document_signature');

/**
 * Document signature model.
 */
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
            references: { model: 'documents', key: 'id' },
          },
          signature: Sequelize.TEXT,
          type: Sequelize.STRING,
          certificate: Sequelize.TEXT,
          created_by: Sequelize.STRING,
        },
        {
          tableName: 'document_signatures',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      DocumentSignatureModel.singleton = this;
    }

    return DocumentSignatureModel.singleton;
  }

  /**
   * Find by document ID.
   * Sorted by `created_at` DESC.
   * @param {string} documentId Document ID.
   * @returns {DocumentSignatureEntity[]} Document signature entities promise.
   * @example
   * const documentSignatureModel = new DocumentSignatureModel();
   * const documentSignatureEntities = await documentSignatureModel.findByDocumentId(documentId);
   * console.log(documentSignatureEntities);
   * // [
   * //   DocumentSignatureEntity {
   * //     id: 'c0a80163-7b1d-11e9-9d3c-0242ac110002',
   * //     documentId: 'c0a80163-7b1d-11e9-9d3c-0242ac110002',
   * //     signature: 'signature',
   * //     type: 'type',
   * //     certificate: 'certificate',
   * //     createdBy: 'createdBy'
   * //   }
   * // ]
   */
  async findByDocumentId(documentId) {
    const options = {
      where: { document_id: documentId },
      sort: [['created_at', 'desc']],
    };
    const documentSignatures = await this.model.findAll(options);
    const documentSignatureEntities = documentSignatures.map(this.prepareEntity);
    return documentSignatureEntities;
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
    });
  }
}

module.exports = DocumentSignatureModel;
