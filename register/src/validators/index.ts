import { validationResult } from 'express-validator';

import RegistersValidator from './registers';
import KeysValidator from './keys';
import RecordsValidator from './records';
import AccessLogValidator from './access_log';
import CustomValidator from './custom';
import ExportValidator from './export';
import ImportValidator from './import';
import RollbackValidator from './rollback';

export default class Validators {
  static singleton: Validators;
  config: object;
  validators: object;

  /**
   * Validators constructor.
   * @param {object} config Config object.
   * @param {object} [customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   */
  constructor(config, customValidators = {}) {
    // Define singleton.
    if (!Validators.singleton) {
      this.config = config;
      this.initValidators(customValidators);
      Validators.singleton = this;
    }
    return Validators.singleton;
  }

  /**
   * Init validators.
   * @param {object} [customValidators] Custom validators as { someValidatorName: SomeValidatorClass, anotherValidatorName: AnotherValidatorClass }.
   * @private
   */
  initValidators(customValidators = {}) {
    // Define validators classses.
    const validatorsClasses = {
      registers: RegistersValidator,
      keys: KeysValidator,
      records: RecordsValidator,
      accessLog: AccessLogValidator,
      custom: CustomValidator,
      export: ExportValidator,
      import: ImportValidator,
      rollback: RollbackValidator,
      ...customValidators
    };

    // Init validators.
    this.validators = Object.entries(validatorsClasses)
      .map((v) => [v[0], new v[1](this.config)])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            const n = {};
            n[v[0] as any] = v[1];
            return n;
          })()
        }),
        {}
      );
  }

  /**
   * Get handler.
   * @param {string} validatorName Validators name.
   * @param {string} methodName Method name.
   * @returns {function}
   */
  getHandler(validatorName, methodName) {
    // Define validators.
    const validator = this.validators[validatorName];
    if (!validator || !validator[methodName]) {
      return;
    }

    // Return validator schema.
    return validator[methodName]();
  }

  /**
   * Get validation result handler.
   * @param {number} statusCode
   */
  getValidationResultHandler(statusCode = 422) {
    return async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(statusCode).json({ errors: errors.array() });
      }
      next();
    };
  }
}
