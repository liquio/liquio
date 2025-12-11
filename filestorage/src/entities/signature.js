const Entity = require('./entity');

/**
 * Signature entity.
 */
class SignatureEntity extends Entity {
  /**
   * Constructor.
   * @param {object} raw Signature RAW object.
   * @param {number} raw.id ID.
   * @param {string} raw.file_id File ID.
   * @param {string} raw.signature Signature.
   * @param {string} raw.certificate Certificate.
   * @param {object} raw.meta Meta.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   */
  constructor({ id, file_id, signature, certificate, meta, created_by, updated_by, created_at, updated_at }) {
    // Call parent constructor.
    super();

    // Save params.
    this.id = id;
    this.fileId = file_id;
    this.signature = signature;
    this.certificate = certificate;
    this.meta = meta;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}

// Export.
module.exports = SignatureEntity;
