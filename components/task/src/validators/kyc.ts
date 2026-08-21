import { checkSchema } from 'express-validator';

import { Validator } from './validator';

/**
 * KYC validator.
 */
export class KycValidator extends Validator {
  private static singleton: KycValidator;

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

