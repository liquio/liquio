import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Login history validator.
 */
export class LoginHistoryValidator extends Validator {
  static singleton: LoginHistoryValidator;

  /**
   * Login history validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
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
