export class ReadableData {
  public readableStream: ReadableStream;
  public dataType?: string;
  public dataLength?: string;

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
