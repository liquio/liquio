const Sequelize = require('sequelize');

const Model = require('./model');
const AdditionalDataSignatureEntity = require('../entities/additional_data_signature');

/**
 * Additional data signature model.
 */
class AdditionalDataSignatureModel extends Model {
  /**
   * Additional data signature model constructor.
   */
  constructor() {
    // Singleton.
    if (!AdditionalDataSignatureModel.singleton) {
      // Call parent constructor.
      super();

      // Define DB model.
      this.model = this.db.define(
        'additionalDataSignature',
        {
          id: { primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV1 },
          document_id: {
            type: Sequelize.UUID,
            references: { model: 'documents', key: 'id' },
          },
          data: Sequelize.TEXT,
          signature: Sequelize.TEXT,
          certificate: Sequelize.TEXT,
          crypt_certificate: Sequelize.TEXT,
          encrypted_data: Sequelize.TEXT,
          encrypted_data_certificate: Sequelize.TEXT,
          created_by: Sequelize.STRING,
          meta: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
        },
        {
          tableName: 'additional_data_signatures',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Define singleton.
      AdditionalDataSignatureModel.singleton = this;
    }

    // Return singleton.
    return AdditionalDataSignatureModel.singleton;
  }

  /**
   * Get by document ID.
   * @param {string} documentId Document ID.
   * @param {string} order Order by createdAt.
   * @returns {Promise<AdditionalDataSignatureEntity[]>} Additional data signature entities list promise.
   */
  async getByDocumentId(documentId, order = 'desc') {
    // Get signatures.
    const additionalDataSignature = await this.model.findAll({
      where: { document_id: documentId },
      order: [['created_at', order]],
    });

    // Convert to entities.
    const additionalDataSignaturesEntities = additionalDataSignature.map((item) => {
      return this.prepareEntity(item);
    });

    return additionalDataSignaturesEntities;
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
   * @param {object} item RAW DB object.
   * @returns {AdditionalDataSignatureEntity} Entity object.
   */
  prepareEntity(item) {
    return new AdditionalDataSignatureEntity({
      id: item.id,
      documentId: item.document_id,
      data: item.data,
      signature: item.signature,
      certificate: item.certificate,
      cryptCertificate: item.crypt_certificate,
      encryptedData: item.encrypted_data,
      encryptedDataCertificate: item.encrypted_data_certificate,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      meta: item.meta,
    });
  }

  /**
   * Prepare for model.
   * @param {AdditionalDataSignatureEntity} item Item as entity object.
   * @returns {object} RAW DB object.
   */
  prepareForModel(item) {
    return {
      document_id: item.documentId,
      data: item.data,
      signature: item.signature,
      certificate: item.certificate,
      crypt_certificate: item.cryptCertificate,
      encrypted_data: item.encryptedData,
      encrypted_data_certificate: item.encryptedDataCertificate,
      created_by: item.createdBy,
      meta: item.meta,
    };
  }
}

module.exports = AdditionalDataSignatureModel;
