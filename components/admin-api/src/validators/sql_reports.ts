import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * SQL Reports  validator.
 */
export class SqlReportsValidator extends Validator {
  static singleton: SqlReportsValidator;

  /**
   * SQL Reports validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);
    return SqlReportsValidator.singleton || (SqlReportsValidator.singleton = this);
  }

  /**
   * CalculateSQL Reports Data schema.
   */
  getSqlReports() {
    return checkSchema({
      ['reportId']: {
        in: ['params'],
        isString: true,
      },
      ['*']: {
        in: ['query'],
        optional: true,
      },
    });
  }
}
