import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Stat validator.
 */
export class StatValidator extends Validator {
  static singleton: StatValidator;

  /**
   * Stat validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);
    return StatValidator.singleton || (StatValidator.singleton = this);
  }

  /**
   * Stat Reports Data schema.
   */
  getSqlReports() {
    return checkSchema({
      ['date']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}
