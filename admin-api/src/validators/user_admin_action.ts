import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * User admin action validator.
 */
export class UserAdminActionValidator extends Validator {
  static singleton: UserAdminActionValidator;

  /**
   * Validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
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
