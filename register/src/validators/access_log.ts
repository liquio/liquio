import { query } from 'express-validator';
import Validator from './validator';

/**
 * Access log validator.
 */
export default class AccessLogValidator extends Validator {
  static singleton: AccessLogValidator;

  /**
   * Access log validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!AccessLogValidator.singleton) {
      AccessLogValidator.singleton = this;
    }
    return AccessLogValidator.singleton;
  }

  /**
   * Schema.
   * @return {ValidationChain[]}
   */
  getAll() {
    return [
      query('offset').isInt().toInt().optional(),
      query('limit').isInt().toInt().optional(),
      query('key_id').isInt().toInt().optional(),
      query('record_id').optional(),
      query('created_from').optional(),
      query('created_to').optional()
    ];
  }
}
