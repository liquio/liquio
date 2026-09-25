// Import.
import request from 'request';

import LinkProvider from '../link_provider';

// Constants.
const REQUEST_METHOD_GET = 'GET';
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
   * @param {string} options.url URL.
   * @param {boolean} [options.redirect] Redirect indicator.
   * @param {string} [options.method] Request method. GET by default.
   * @returns {boolean} Is valid options indicator.
   */
  isValidOptions(options) {
    // Check if not valid.
    if (typeof options !== 'object') {
      return false;
    }
    if (typeof options.url !== 'string') {
      return false;
    }

    // Rerturn as valid in other cases.
    return true;
  }

  /**
   * Open.
   * @param {object} options Options.
   * @param {string} options.url URL.
   * @param {boolean} [options.redirect] Redirect indicator.
   * @param {string} [options.method] Request method. GET by default.
   * @param {object} res HTTP response.
   */
  async open(options, res) {
    // Check.
    const isValidData = this.isValidOptions(options);
    if (!isValidData) {
      res.status(RESPONSE_NOT_FOUND_CODE).send(RESPONSE_NOT_FOUND_OBJECT);
    }

    // Define params.
    const { url, method, redirect } = options;

    // Redirect if need it.
    if (redirect) {
      return res.redirect(url);
    }

    // Do request and pipe response in other cases.
    const requestOptions = { url, method: method || REQUEST_METHOD_GET };
    request(requestOptions).pipe(res);
  }
}

// Export.
export default SimpleLinkProvider;
