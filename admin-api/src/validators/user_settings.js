const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * User settings validator.
 */
class UserSettingsValidator extends Validator {
  /**
   * User settings validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!UserSettingsValidator.singleton) {
      UserSettingsValidator.singleton = this;
    }
    return UserSettingsValidator.singleton;
  }

  /**
   * Schema.
   */
  get() {
    return checkSchema({});
  }

  /**
   * Schema.
   */
  createOrUpdate() {
    return checkSchema({
      ['*']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }

            return true;
          },
        },
      },
    });
  }
}

module.exports = UserSettingsValidator;
