const Entity = require('./entity');

/**
 * Additional data signature entity.
 */
class AdditionalDataSignatureEntity extends Entity {
  /**
   * Additional data signature entity constructor.
   * @param {object} options Additional data tignatire object.
   * @param {string} options.id ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.data Signed data.
   * @param {string} options.signature Signature.
   * @param {string} options.certificate Certificate.
   * @param {string} options.cryptCertificate Crypt certificate.
   * @param {string} options.encryptedData Encrypted data.
   * @param {string} options.encryptedDataCertificate Encrypted data certificate.
   * @param {string} options.createdBy Created by.
   * @param {object} options.meta Meta.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({
    id,
    documentId,
    data,
    signature,
    certificate,
    cryptCertificate,
    encryptedData,
    encryptedDataCertificate,
    createdBy,
    meta,
    createdAt,
    updatedAt,
  }) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.data = data;
    this.signature = signature;
    this.certificate = certificate;
    this.cryptCertificate = cryptCertificate;
    this.encryptedData = encryptedData;
    this.encryptedDataCertificate = encryptedDataCertificate;
    this.createdBy = createdBy;
    this.meta = meta;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = AdditionalDataSignatureEntity;
