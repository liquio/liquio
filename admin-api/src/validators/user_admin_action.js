const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * User admin action validator.
 */
class UserAdminActionValidator extends Validator {
  /**
   * Validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    // Singleton.
    if (!UserAdminActionValidator.singleton) {
      // Call parent constructor.
      super(validationConfig);

      // Define singleton.
      UserAdminActionValidator.singleton = this;
    }

    // Return singleton.
    return UserAdminActionValidator.singleton;
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

module.exports = UserAdminActionValidator;
