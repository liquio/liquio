const EVENTS = {
  end: 'end',
  data: 'data',
};

/**
 * Error thrown when a stream exceeds the allowed size.
 */
export class PayloadTooLargeError extends Error {
  status = 413;

  constructor(message = 'Payload too large.') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * Stream.
 */
export class Stream {
  /**
   * Events.
   * @returns {EVENTS}
   */
  static get Events() {
    return EVENTS;
  }

  /**
   * Wait event.
   * @param {any} stream Stream.
   * @param {string} event Event.
   * @returns {Promise<void>}
   */
  static async waitEvent(stream: any, event: string) {
    return new Promise((resolve, reject) => {
      try {
        stream.on(event, resolve);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Wait "end" event.
   * @param {any} stream Stream.
   */
  static async waitEndEvent(stream: any) {
    return await Stream.waitEvent(stream, Stream.Events.end);
  }

  /**
   * Get file content.
   * @param {any} stream Stream.
   * @returns {Promise<string>}
   */
  static async getFileContent(stream: any) {
    let fileContent = '';
    stream.on(Stream.Events.data, (chunk: any) => {
      fileContent += chunk;
    });

    await Stream.waitEndEvent(stream);
    return fileContent;
  }

  /**
   * Read whole stream into a buffer, rejecting with PayloadTooLargeError when it exceeds the limit.
   * Checks Content-Length up front and counts received bytes; chunks are dropped after overflow.
   * @param {any} stream Readable stream (HTTP request).
   * @param {number} limit Max size in bytes.
   * @returns {Promise<Buffer>}
   */
  static readWithLimit(stream: any, limit: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const declared = Number(stream.headers?.['content-length']);
      if (Number.isFinite(declared) && declared > limit) {
        stream.pause?.();
        return reject(new PayloadTooLargeError());
      }

      const chunks: Buffer[] = [];
      let total = 0;
      let done = false;

      const cleanup = () => {
        stream.off('data', onData);
        stream.off('end', onEnd);
        stream.off('error', onError);
      };
      const onData = (chunk: Buffer) => {
        total += chunk.length;
        if (total > limit) {
          done = true;
          chunks.length = 0;
          cleanup();
          stream.on('error', () => {});
          stream.pause?.();
          return reject(new PayloadTooLargeError());
        }
        chunks.push(chunk);
      };
      const onEnd = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve(Buffer.concat(chunks));
      };
      const onError = (error: Error) => {
        if (done) return;
        done = true;
        cleanup();
        reject(error);
      };

      stream.on('data', onData);
      stream.on('end', onEnd);
      stream.on('error', onError);
    });
  }
}
