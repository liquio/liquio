// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

class Option {

  /**
   * Get.
   * @param {object} options Options.
   */
  async get(_options) {
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = Option;
