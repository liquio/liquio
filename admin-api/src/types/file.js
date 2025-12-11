class File {
  /**
   * @constructor
   * @param {Object} params
   * @param {string} params.name
   * @param {Buffer} params.content
   * @param {string} [params.dataType]
   * @param {string} [params.dataLength]
   */
  constructor({ name, content, dataType, dataLength }) {
    this.name = name;
    this.content = content;
    this.dataType = dataType;
    this.dataLength = dataLength;
  }
}

module.exports = File;
