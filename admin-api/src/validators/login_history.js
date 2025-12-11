const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Login history validator.
 */
class LoginHistoryValidator extends Validator {
  /**
   * Validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    // Singleton.
    if (!LoginHistoryValidator.singleton) {
      // Call parent constructor.
      super(validationConfig);

      // Define singleton.
      LoginHistoryValidator.singleton = this;
    }

    // Return singleton.
    return LoginHistoryValidator.singleton;
  }

  /**
   * Get list.
   */
  getList() {
    return checkSchema({
      ['offset']: {
        in: ['query'],
        optional: true,
      },
      ['limit']: {
        in: ['query'],
        optional: true,
      },
      ['filter']: {
        in: ['query'],
        optional: true,
      },
    });
  }
}

module.exports = LoginHistoryValidator;
