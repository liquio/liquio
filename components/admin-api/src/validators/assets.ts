import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Assets validator.
 */
export class AssetsValidator extends Validator {
  static singleton: AssetsValidator;

  /**
   * Assets validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
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
