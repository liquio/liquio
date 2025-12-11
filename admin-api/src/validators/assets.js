const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Assets validator.
 */
class AssetsValidator extends Validator {
  /**
   * Validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!AssetsValidator.singleton) {
      AssetsValidator.singleton = this;
    }
    return AssetsValidator.singleton;
  }

  /**
   * Schema.
   */
  getToUnits() {
    return checkSchema({
      ['user_ids']: {
        in: ['query'],
        optional: false,
        isString: true,
      },
    });
  }

  getToRegisters() {
    return checkSchema({
      ['user_ids']: {
        in: ['query'],
        optional: false,
        isString: true,
      },
    });
  }
}

module.exports = AssetsValidator;
