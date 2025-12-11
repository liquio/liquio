const Model = require('../model');

// Constants.
const ERROR_OVERRIDE = 'Method must be override.';

class DictionaryModel extends Model {
  constructor() {
    super();
  }

  /**
   * Get dictionary name.
   * @returns {string}
   */
  get name() {
    throw new Error(ERROR_OVERRIDE);
  }

  /**
   * Get all data.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = DictionaryModel;
