
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Custom interface.
 */
class CustomInterfaceValidator extends Validator {
  /**
   * Custom interface constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!CustomInterfaceValidator.singleton) {
      CustomInterfaceValidator.singleton = this;
    }
    return CustomInterfaceValidator.singleton;
  }

  /**
   * Get all.
   */
  getAll() {
    return checkSchema({
      ['route']: {
        in: ['query'],
        isString: true
      }
    });
  }
}

module.exports = CustomInterfaceValidator;
