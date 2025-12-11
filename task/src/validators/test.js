
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Test validator.
 */
class TestValidator extends Validator {
  /**
   * Test validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!TestValidator.singleton) {
      TestValidator.singleton = this;
    }
    return TestValidator.singleton;
  }

  /**
   * Ping schema.
   */
  ping() {
    return checkSchema({
      ['*']: {
        in: ['query'],
        optional: true,
      },
    });
  }

  /**
   * Ping services schema.
   */
  pingServices() {
    return checkSchema({});
  }
}

module.exports = TestValidator;
