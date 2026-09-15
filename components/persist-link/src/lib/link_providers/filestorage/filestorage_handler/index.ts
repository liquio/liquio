// Import.
import FilestorageConnection from './filestorage_connection';

/**
 * Filestorage handler.
 */
class FilestorageHandler {
  /**
   * Filestorage handler constructor.
   * @param {object} config Filestorage handler config.
   */
  constructor(config) {
    // Define singleton.
    if (!FilestorageHandler.singleton) {
      // Prepare params.
      this.config = config;
      this.connections = {};

      // Init connections.
      for (const serverConfig of config.serversList) {
        const { name } = serverConfig;
        this.connections[name] = new FilestorageConnection(serverConfig);
      }

      // Set singleton.
      FilestorageHandler.singleton = this;
    }
    return FilestorageHandler.singleton;
  }
}

// Export.
export default FilestorageHandler;
