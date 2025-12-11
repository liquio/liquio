class ReadableData {
  /**
   * @constructor
   * @param {Object} params
   * @param {ReadableStream} params.readableStream
   * @param {string} [params.dataType]
   * @param {string} [params.dataLength]
   */
  constructor({ readableStream, dataType, dataLength }) {
    this.readableStream = readableStream;
    this.dataType = dataType;
    this.dataLength = dataLength;
  }
}

module.exports = ReadableData;
