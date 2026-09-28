// Import.
import { getLog } from '../../context';
import FilestorageHandler from './filestorage_handler';
import LinkProvider from '../link_provider';

// Constants.
const RESPONSE_NOT_FOUND_CODE = 404;
const RESPONSE_NOT_FOUND_OBJECT = {
  error: {
    message: 'Not found.',
  },
};

/**
 * Filestorage link provider.
 */
class FilestorageLinkProvider extends LinkProvider {
  /**
   * Filestorage link provider constructor.
   * @param {object} config Provider config.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!FilestorageLinkProvider.singleton) {
      this.filestorageHandler = new FilestorageHandler(config);
      FilestorageLinkProvider.singleton = this;
    }
    return FilestorageLinkProvider.singleton;
  }

  /**
   * Is valid data.
   * @param {object} options Options.
   * @param {string} options.serverName Filestorage server name.
   * @param {string} options.fileId File ID.
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
    if (typeof options.fileId !== 'string') {
      return false;
    }

    // Rerturn as valid in other cases.
    return true;
  }

  /**
   * Open.
   * @param {object} options Options.
   * @param {string} options.serverName Filestorage server name.
   * @param {string} options.fileId File ID.
   * @param {object} res HTTP response.
   * @param {object} responseType Response type.
   * @param {object} additionalOptions Additional options.
   * @param {boolean} additionalOptions.showInBrowser Should show file if browser.
   */
  async open(options, res, responseType, { showInBrowser = false }) {
    // Check.
    const isValidData = this.isValidOptions(options);
    if (!isValidData) {
      getLog().save('filestorage-invalid-options', {
        isValidData,
        options,
      });
      res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    // Define params.
    const { serverName, fileId, isP7s = false } = options;
    const filestorageConnection = this.filestorageHandler.connections[serverName];

    // Check connection.
    if (!filestorageConnection) {
      getLog().save('filestorage-invalid-connection', {
        isValidData,
        filestorageConnection,
        options,
      });
      return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    // Do request and pipe response in other cases.
    const handleStreamError = (error) => {
      getLog().save('filestorage-download-stream-error', {
        error: error && error.message,
        options,
      });
    };
    const downloadReadableStream = await filestorageConnection.downloadFile(fileId, { isP7s });
    downloadReadableStream
      .on('response', (res) => {
        if (showInBrowser) res.headers['Content-Disposition'] = 'inline';
        res.headers['Accept-Ranges'] = 'bytes';
      })
      .on('error', handleStreamError)
      .pipe(res)
      .on('error', handleStreamError);
  }

  /**
   * Get file stream.
   * @param {object} options Options.
   * @param {string} options.serverName Filestorage server name.
   * @param {string} options.fileId File ID.
   * @param {boolean} options.isP7s Is P7S file.
   * @returns {Promise<Stream>} File stream.
   */
  async getFileStream(options) {
    // Check.
    const isValidData = this.isValidOptions(options);
    if (!isValidData) {
      getLog().save('filestorage-invalid-options-get-stream', {
        isValidData,
        options,
      });
      throw new Error('Invalid options.');
    }

    // Define params.
    const { serverName, fileId, isP7s = false } = options;
    const filestorageConnection = this.filestorageHandler.connections[serverName];

    // Check connection.
    if (!filestorageConnection) {
      getLog().save('filestorage-invalid-connection-get-stream', {
        isValidData,
        filestorageConnection,
        options,
      });
      throw new Error('Connection not found.');
    }

    // Get and return file stream.
    return await filestorageConnection.downloadFile(fileId, { isP7s });
  }
}

// Export.
export default FilestorageLinkProvider;
