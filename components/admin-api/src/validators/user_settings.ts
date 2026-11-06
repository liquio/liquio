import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * User settings validator.
 */
export class UserSettingsValidator extends Validator {
  static singleton: UserSettingsValidator;

  /**
   * User settings validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
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
