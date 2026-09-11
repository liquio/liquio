// Import.
import LinkProvider from '../link_provider';
import OpenStackHandler from './open_stack_handler';

// Constants.
const RESPONSE_NOT_FOUND_CODE = 404;
const RESPONSE_NOT_FOUND_OBJECT = {
  error: {
    message: 'Not found.',
  },
};

/**
 * OpenStack link provider.
 */
class OpenStackLinkProvider extends LinkProvider {
  /**
   * OpenStack link provider constructor.
   * @param {object} config Provider config.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!OpenStackLinkProvider.singleton) {
      this.openStackHandler = new OpenStackHandler(config);
      OpenStackLinkProvider.singleton = this;
    }
    return OpenStackLinkProvider.singleton;
  }

  /**
   * Is valid data.
   * @param {object} options Options.
   * @param {string} options.serverName OpenStack server name.
   * @param {string} options.fileName File name.
   * @returns {boolean} Is valid options indicator.
   */
  isValidOptions(options) {
    // Check if not valid.
    if (typeof options !== 'object') {
      return false;
    }
    if (typeof options.serverName !== 'string') {
      return false;
    }
    if (typeof options.fileName !== 'string') {
      return false;
    }

    // Rerturn as valid in other cases.
    return true;
  }

  /**
   * Open.
   * @param {object} options Options.
   * @param {string} options.serverName OpenStack server name.
   * @param {string} options.fileName File name.
   * @param {object} res HTTP response.
   */
  async open(options, res) {
    // Check.
    const isValidData = this.isValidOptions(options);
    if (!isValidData) {
      res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    // Define params.
    const { serverName, fileName } = options;
    const openStackConnection = this.openStackHandler.connections[serverName];

    // Check connection.
    if (!openStackConnection) {
      return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    // Do request and pipe response in other cases.
    const { addContentDispositionHeader = true } = this.config;
    if (addContentDispositionHeader) res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    const downloadReadableStream = await openStackConnection.downloadFile(fileName);
    downloadReadableStream.pipe(res);
  }
}

// Export.
export default OpenStackLinkProvider;
