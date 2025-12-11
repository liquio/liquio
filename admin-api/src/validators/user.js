const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * User validator.
 */
class UserValidator extends Validator {
  /**
   * Validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!UserValidator.singleton) {
      UserValidator.singleton = this;
    }
    return UserValidator.singleton;
  }

  /**
   * Schema.
   */
  getUsers() {
    return checkSchema({
      ['id']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['email']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['phone']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['search']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['ipn']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['role']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  findById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  update() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['role']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['isActive']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  block() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  unblock() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  setAdmin() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['isCurrentAuthClient']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  unsetAdmin() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['isCurrentAuthClient']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  deleteUser() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['ipn']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  search() {
    return checkSchema({
      ['brief_info']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['code']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['.ids']: {
        in: ['body'],
        optional: true,
        isArray: true,
      },
      ['ids.*']: {
        in: ['body'],
        isString: true,
      },
      ['search']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  sendMessageToAllUsers() {
    return checkSchema({
      ['text']: {
        in: ['body'],
        isString: true,
      },
      ['title']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  getMessagesForAllUsers() {
    return checkSchema({
      ['start']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['count']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  deleteMessageForAllUsers() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  setPassword() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['password']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  createLocalUser() {
    return checkSchema({
      ['email']: {
        in: ['body'],
        isEmail: true,
      },
      ['password']: {
        in: ['body'],
        isString: true,
      },
      ['firstName']: {
        in: ['body'],
        isString: true,
      },
      ['middleName']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['lastName']: {
        in: ['body'],
        isString: true,
      },
      ['needOnboarding']: {
        in: ['body'],
        isBoolean: true,
        optional: true,
      },
      ['onboardingTaskId']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
    });
  }

  enforce2fa() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  disable2fa() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}

module.exports = UserValidator;
