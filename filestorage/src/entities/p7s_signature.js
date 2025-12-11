const Entity = require('./entity');

const P7S_CONTENT_TYPE = 'application/pkcs7-mime';
const P7S_FILE_EXTENSION = 'p7s';

/**
 * Signature entity.
 */
class P7sSignatureEntity extends Entity {
  /**
   * Constructor.
   * @param {object} raw Signature RAW object.
   * @param {number} raw.id ID.
   * @param {string} raw.file_id File ID.
   * @param {string} raw.p7s P7S signature.
   * @param {object} raw.meta Meta.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   * @param {string} raw.folder Updated at.
   */
  constructor({ id, file_id, p7s, meta, created_by, updated_by, created_at, updated_at, folder }) {
    // Call parent constructor.
    super();

    // Save params.
    this.id = id;
    this.fileId = file_id;
    this.p7s = p7s;
    this.meta = meta;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.folder = folder;
  }

  /**
   * Content-type.
   * @returns {P7S_CONTENT_TYPE} P7S file content-type.
   */
  static get ContentType() {
    return P7S_CONTENT_TYPE;
  }

  /**
   * File extension.
   * @returns {P7S_FILE_EXTENSION} P7S file extension.
   */
  static get FileExtension() {
    return P7S_FILE_EXTENSION;
  }

  /**
   * Get P7S file name.
   * @param {string} fileName Original file name
   */
  static getP7sFileName(fileName) {
    // Define and rturn P7S file name.
    const p7sFileName = `${fileName}.${P7sSignatureEntity.FileExtension}`;
    return p7sFileName;
  }

  /**
   * Get buffer.
   * @returns {Buffer} P7s as buffer.
   */
  getAsBuffer() {
    // Define and return P7S buffer.
    const p7sBuffer = Buffer.from(this.p7s, 'base64');
    return p7sBuffer;
  }
}

// Export.
module.exports = P7sSignatureEntity;
