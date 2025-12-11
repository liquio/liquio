const Entity = require('./entity');

/**
 * File entity.
 */
class FileEntity extends Entity {
  /**
   * Constructor.
   * @param {object} raw File RAW object.
   * @param {string} raw.id ID.
   * @param {string} raw.name Name.
   * @param {string} raw.content_type Content-type.
   * @param {number} data.content_length Content-length.
   * @param {string} raw.description Description.
   * @param {number} raw.container_id Container ID.
   * @param {Buffer} raw.data Data.
   * @param {Buffer} raw.preview Preview.
   * @param {{md5, sha1, sha256}} raw.hash Hash.
   * @param {object} raw.meta Meta.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   * @param {string} raw.folder Updated at.
   * @param {boolean} removeData Remove data.
   */
  constructor(
    {
      id,
      name,
      content_type,
      content_length,
      description,
      container_id,
      data,
      preview,
      hash,
      meta,
      created_by,
      updated_by,
      created_at,
      updated_at,
      folder,
    },
    removeData = false,
  ) {
    // Call parent constructor.
    super();

    // Save params.
    this.id = id;
    this.name = name;
    this.contentType = content_type;
    this.contentLength = content_length;
    this.description = description;
    this.containerId = container_id;
    this.hash = hash;
    this.meta = meta;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.folder = folder;
    if (!removeData) {
      this.data = data;
      this.preview = preview;
    }

    // Validate and save result.
    this.isValid = this.validate();
  }

  /**
   * Validate.
   * @return {boolean} Is valid indicator.
   */
  validate() {
    // Check hash.
    if (typeof this.hash !== 'object') {
      return false;
    }
    if (typeof this.hash.md5 !== 'string' || this.hash.md5.length !== 32) {
      return false;
    }
    if (typeof this.hash.sha1 !== 'string' || this.hash.sha1.length !== 40) {
      return false;
    }
    if (typeof this.hash.sha256 !== 'string' || this.hash.sha256.length !== 64) {
      return false;
    }

    // Return true in other cases.
    return true;
  }
}

// Export.
module.exports = FileEntity;
