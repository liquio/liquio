
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Localization language validator.
 */
class LocalizationLanguageValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor (validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!LocalizationLanguageValidator.singleton) {
      LocalizationLanguageValidator.singleton = this;
    }
    return LocalizationLanguageValidator.singleton;
  }

  /**
   * Schema.
   */
  getAll () {
    return checkSchema({
      ['filters.code']: {
        in: ['query'],
        optional: true,
        isString: true
      }
    });
  }
}

module.exports = LocalizationLanguageValidator;
