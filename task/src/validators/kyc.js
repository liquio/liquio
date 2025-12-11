const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * KYC validator.
 */
class KycValidator extends Validator {
  /**
   * KYC validator constructor.
   * @param {object} validationConfig Validadtion config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    return KycValidator.singleton || ( KycValidator.singleton = this );
  }

  createSession() {
    return checkSchema({
      ['provider']: {
        in: ['params'],
        isString: true,
      },
      ['returnUrl']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  updateSession() {
    return checkSchema({
      ['provider']: {
        in: ['params'],
        isString: true,
      },
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  getSession() {
    return checkSchema({
      ['provider']: {
        in: ['params'],
        isString: true,
      },
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}

module.exports = KycValidator;
