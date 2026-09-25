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
}
