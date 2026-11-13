// Constants.
const ERROR_METHOD_NOT_DEFINED = 'Provider method not defined.';

/**
 * Link provider.
 */
class LinkProvider {
  /**
   * Link provider constructor.
   * @param {object} config Provider config.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Is valid data.
   * @param {object} data Data.
   * @returns {boolean} Is valid data indicator.
   */
  isValidOptions() {
    throw new Error(ERROR_METHOD_NOT_DEFINED);
  }

  /**
   * Open.
   * @param {object} data Data.
   * @param {object} res HTTP response.
   */
  async open() {
    throw new Error(ERROR_METHOD_NOT_DEFINED);
  }

  /**
   * Get file stream (optional method).
   * @param {object} options Options.
   * @returns {Promise<Stream|null>} File stream or null if not supported.
   */
  async getFileStream() {
    return null;
  }
}

// Export.
export default LinkProvider;
