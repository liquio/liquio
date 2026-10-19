// Import.
import rawBody from 'raw-body';

// Constants.
const EVENTS = {
  end: 'end',
  data: 'data',
};

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
  static async waitEvent(stream, event) {
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
  static async waitEndEvent(stream) {
    return await Stream.waitEvent(stream, Stream.Events.end);
  }

  /**
   * Get file content.
   * @param {any} stream Stream.
   * @param {object} [options] Options.
   * @param {string|number} [options.limit] Max content size as bytes or string like "10mb". Rejects with 413 error if exceeded.
   * @returns {Promise<string>}
   */
  static async getFileContent(stream, { limit }: { limit?: string | number } = {}): Promise<string> {
    if (limit) {
      return rawBody(stream, { limit, length: stream.headers?.['content-length'], encoding: 'utf-8' });
    }

    let fileContent = '';
    stream.on(Stream.Events.data, (chunk) => {
      fileContent += chunk;
    });

    await Stream.waitEndEvent(stream);
    return fileContent;
  }
}
