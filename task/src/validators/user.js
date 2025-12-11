
const { check } = require('express-validator');
const Validator = require('./validator');

/**
 * Users validator.
 */
class UserValidator extends Validator {
  /**
   * Users validator constructor.
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
   * GET - get by ID.
   */
  findById() {
    return check('id').not().isEmpty().withMessage('User ID should be defined.');
  }

  /**
   * POST - set two factor auth.
   */
  setTwoFactorAuth() {
    return check('useTwoFactorAuth').isBoolean().withMessage('Use two factor auth indicator should be defined as boolean.');
  }

  /**
   * GET - check if phone already used.
   */
  isPhoneAlreadyUsed() {
    return [
      check('phone').not().isEmpty().withMessage('Phone should be defined in query params.'),
      check('phone').isMobilePhone('uk-UA').withMessage('Phone number should be in correct format.'),
    ];
  }

  /**
   * POST - send sms for phone verification.
   */
  sendSmsForPhoneVerification() {
    return [
      check('phone').isMobilePhone('uk-UA').withMessage('Phone number should be in correct format.'),
    ];
  }

  /**
   * POST - verify phone.
   */
  verifyPhone() {
    return [
      check('code').isString().withMessage('Code should be defined as string.'),
      check('phone').isMobilePhone('uk-UA').withMessage('Phone number should be in correct format.'),
    ];
  }

  /**
   * PUT - change email.
   */
  changeEmail() {
    return [
      check('email').not().isEmpty(),
      check('email').isEmail(),
    ];
  }

  /**
   * POST - check email.
   */
  checkEmail() {
    return [
      check('email').not().isEmpty(),
      check('email').isEmail(),
    ];
  }

  /**
   * POST - confirm change email.
   */
  confirmChangeEmail() {
    return [
      check('email').not().isEmpty(),
      check('email').isEmail(),
      check('code').isString().withMessage('Code should be defined as string.'),
    ];
  }

  /**
   * POST - check email confirmation code.
   */
  checkEmailConfirmationCode() {
    return [
      check('email').not().isEmpty(),
      check('email').isEmail(),
      check('code').isString().withMessage('Code should be defined as string.'),
    ];
  }

}

module.exports = UserValidator;
