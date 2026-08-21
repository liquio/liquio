// Import.
import OpenStackConnection from './open_stack_connection';

/**
 * OpenStack handler.
 */
class OpenStackHandler {
  /**
   * OpenStack handler constructor.
   * @param {object} config OpenStack handler config.
   */
  constructor(config) {
    // Define singleton.
    if (!OpenStackHandler.singleton) {
      // Prepare params.
      this.config = config;
      this.connections = {};

      // Init connections.
      for (const serverConfig of config.serversList) {
        const { name } = serverConfig;
        this.connections[name] = new OpenStackConnection(serverConfig);
      }

      // Set singleton.
      OpenStackHandler.singleton = this;
    }
    return OpenStackHandler.singleton;
  }
}

// Export.
export default OpenStackHandler;
