
const Controller = require('./controller');
const DictionaryModels = require('../models/dictionaries');

// Constants.
const ERROR_DICTIONARY_DOES_NOT_EXIST = 'Dictionary doesn\'t exist.';

/**
 * Dictionary controller.
 */
class DictionaryController extends Controller {
  /**
   * Dictionary controller constructor.
   */
  constructor() {
    // Define singleton.
    if (!DictionaryController.singleton) {
      super();
      this.dictionaryModels = new DictionaryModels();
      DictionaryController.singleton = this;
    }
    return DictionaryController.singleton;
  }

  /**
   * Get all dictionaries.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    let dictionaries;
    try {
      dictionaries = await this.dictionaryModels.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, dictionaries);
  }

  /**
   * Get dictionary by name.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getDictionaryByName(req, res) {
    const name = req.params.name;

    let dictionary;
    try {
      dictionary = await this.dictionaryModels.getByName(name);
      if (!dictionary) {
        return this.responseError(res, ERROR_DICTIONARY_DOES_NOT_EXIST, 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, dictionary);
  }
}

module.exports = DictionaryController;
