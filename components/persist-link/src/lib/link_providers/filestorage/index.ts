// Import.
import { getLog } from '../../context';
import { describeOptions } from '../../log_redact';
import { pipeUpstreamResponse } from '../../stream_response';
import FilestorageHandler from './filestorage_handler';
import LinkProvider from '../link_provider';

// Constants.
const RESPONSE_NOT_FOUND_CODE = 404;
const RESPONSE_NOT_FOUND_OBJECT = {
  error: {
    message: 'Not found.',
  },
};
const RESPONSE_BAD_GATEWAY_CODE = 502;
const RESPONSE_BAD_GATEWAY_OBJECT = {
  error: {
    message: 'Bad gateway.',
  },
};
const DEFAULT_INLINE_CONTENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif'];
const CONTENT_SECURITY_POLICY = "sandbox; default-src 'none'";

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
   * Get content types allowed to be displayed inline.
   * @returns {string[]} Lower-cased content types.
   */
  getInlineContentTypes() {
    const { inlineContentTypes = DEFAULT_INLINE_CONTENT_TYPES } = this.config || {};
    return (Array.isArray(inlineContentTypes) ? inlineContentTypes : DEFAULT_INLINE_CONTENT_TYPES)
      .map((type) => String(type).trim().toLowerCase())
      .filter((type) => type !== 'text/html' && type !== 'image/svg+xml');
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
        options: describeOptions(options),
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
        hasConnection: !!filestorageConnection,
        options: describeOptions(options),
      });
      return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    // Do request and pipe response in other cases.
    const handleStreamError = (error) => {
      getLog().save('filestorage-download-stream-error', {
        error: error && error.message,
        options: describeOptions(options),
      });
    };
    let downloadReadableStream;
    try {
      downloadReadableStream = await filestorageConnection.downloadFile(fileId, { isP7s });
    } catch (error) {
      handleStreamError(error);
      return res.status(RESPONSE_BAD_GATEWAY_CODE).send(RESPONSE_BAD_GATEWAY_OBJECT);
    }
    downloadReadableStream.on('error', handleStreamError);
    pipeUpstreamResponse(downloadReadableStream, res, (headers) => {
      const contentType = String(headers['content-type'] || headers['Content-Type'] || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const isInlineAllowed = this.getInlineContentTypes().includes(contentType);
      const currentDisposition = headers['content-disposition'] || headers['Content-Disposition'];

      // Never render non-allowlisted types inline, even if upstream asked for it.
      let disposition: string | undefined;
      if (!isInlineAllowed) {
        disposition = 'attachment';
      } else if (showInBrowser) {
        disposition = 'inline';
      }
      if (disposition) {
        delete headers['content-disposition'];
        headers['Content-Disposition'] = /^\s*(inline|attachment)/i.test(currentDisposition || '')
          ? currentDisposition.replace(/^\s*(inline|attachment)/i, disposition)
          : disposition;
      }

      headers['X-Content-Type-Options'] = 'nosniff';
      headers['Content-Security-Policy'] = CONTENT_SECURITY_POLICY;
      headers['Accept-Ranges'] = 'bytes';
    }).on('error', handleStreamError);
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
        options: describeOptions(options),
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
        hasConnection: !!filestorageConnection,
        options: describeOptions(options),
      });
      throw new Error('Connection not found.');
    }

    // Get and return file stream.
    return await filestorageConnection.downloadFile(fileId, { isP7s });
  }
}

// Export.
export default FilestorageLinkProvider;
