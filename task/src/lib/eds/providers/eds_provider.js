const ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED = 'Save method not defined in current EDS provider.';

/**
 * EDS provider.
 */
class EdsProvider {
  /**
   * EDS provider constructor.
   * @param {string} name Provider name.
   */
  constructor(name) {
    // Save params.
    this.name = name;
  }

  /**
   * Check.
   */
  async check() {
    // Throw error that method not re-defined in child class.
    throw new Error(ERROR_MESSAGE_SAVE_METHOD_NOT_DEFINED);
  }
}

// Export.
module.exports = EdsProvider;
