import { param } from 'express-validator';
import Validator from './validator';

/**
 * Import validator.
 */
export default class ImportValidator extends Validator {
  static singleton: ImportValidator;

  /**
   * Import validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!ImportValidator.singleton) {
      ImportValidator.singleton = this;
    }
    return ImportValidator.singleton;
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getImportStatusWithDetails() {
    return [param('importId').isString()];
  }
}
