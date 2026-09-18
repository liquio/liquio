import { body, param } from 'express-validator';
import Validator from './validator';

/**
 * Export validator.
 */
export default class ExportValidator extends Validator {
  static singleton: ExportValidator;

  /**
   * Export validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!ExportValidator.singleton) {
      ExportValidator.singleton = this;
    }
    return ExportValidator.singleton;
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  startPreparingToExport() {
    return [body('keyId').isInt().toInt(), body('options').isObject().optional().default({})];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getExportStatus() {
    return [param('exportId').isString()];
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getExportData() {
    return [param('exportId').isString()];
  }
}
