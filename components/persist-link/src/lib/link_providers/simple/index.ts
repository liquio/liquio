// Import.
import { getLog } from '../../context';
import LinkProvider from '../link_provider';

// Constants.
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const RESPONSE_NOT_FOUND_CODE = 404;
const RESPONSE_NOT_FOUND_OBJECT = {
  error: {
    message: 'Not found.',
  },
};

/**
 * Simple link provider.
 */
class SimpleLinkProvider extends LinkProvider {
  /**
   * Simple link provider constructor.
   * @param {object} config Provider config.
   */
  constructor(config) {
    super(config);

    // Define singleton.
    if (!SimpleLinkProvider.singleton) {
      SimpleLinkProvider.singleton = this;
    }
    return SimpleLinkProvider.singleton;
  }

  /**
   * Is valid data.
   * @param {object} options Options.
   * @param {string} options.url Absolute http(s) URL.
   * @returns {boolean} Is valid options indicator.
   */
  isValidOptions(options) {
    if (!options || typeof options !== 'object' || typeof options.url !== 'string') {
      return false;
    }

    try {
      return ALLOWED_PROTOCOLS.has(new URL(options.url).protocol);
    } catch {
      return false;
    }
  }

  /**
   * Open. Always redirects to the http(s) URL; the service never requests the URL itself.
   * Legacy `method` and `redirect` options are ignored (the old proxy mode was an SSRF vector).
   * @param {object} options Options.
   * @param {string} options.url Absolute http(s) URL.
   * @param {object} res HTTP response.
   */
  async open(options, res) {
    if (!this.isValidOptions(options)) {
      getLog().save('simple-invalid-options', { hasUrl: typeof options?.url === 'string' });
      return res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    return res.redirect(options.url);
  }
}

// Export.
export default SimpleLinkProvider;
