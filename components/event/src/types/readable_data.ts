export class ReadableData {
  readableStream: any;
  dataType: any;
  dataLength: any;

  /**
   * @constructor
   * @param {Object} params
   * @param {ReadableStream} params.readableStream
   * @param {string} [params.dataType]
   * @param {string} [params.dataLength]
   */
  constructor({ readableStream, dataType, dataLength }: any) {
    this.readableStream = readableStream;
    this.dataType = dataType;
    this.dataLength = dataLength;
  }
}
