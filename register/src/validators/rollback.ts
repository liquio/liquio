import { param, body } from 'express-validator';
import Validator from './validator';

/**
 * Import validator.
 */
export default class RollbackValidator extends Validator {
  static singleton: RollbackValidator;

  /**
   * Import validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!RollbackValidator.singleton) {
      RollbackValidator.singleton = this;
    }
    return RollbackValidator.singleton;
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  startRollback() {
    return [body('keyId').isInt().toInt(), body('timePoint').isString()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getRollbackStatusWithDetails() {
    return [param('rollbackId').isString()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  rollbackRecord() {
    return [body('historyId').isString(), body('recordId').isString(), body('keyId').isInt().toInt()];
  }
}
