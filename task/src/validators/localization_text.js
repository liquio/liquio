
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Localization text validator.
 */
class LocalizationTextValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor (validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!LocalizationTextValidator.singleton) {
      LocalizationTextValidator.singleton = this;
    }
    return LocalizationTextValidator.singleton;
  }

  /**
   * Schema.
   */
  getAll () {
    return checkSchema({
      ['filters.localization_language_code']: {
        in: ['query'],
        optional: true,
        isString: true
      },
      ['filters.key']: {
        in: ['query'],
        optional: true,
        isString: true
      }
    });
  }
}

module.exports = LocalizationTextValidator;
