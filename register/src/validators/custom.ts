import { query } from 'express-validator';
import Validator from './validator';

/**
 * Register validator.
 */
export default class CustomValidator extends Validator {
  static singleton: CustomValidator;

  /**
   * Register validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!CustomValidator.singleton) {
      CustomValidator.singleton = this;
    }
    return CustomValidator.singleton;
  }

  /**
   * Schema.
   */
  getPostCode() {
    return [
      query('regionName').isString(),
      query('districtName').isString(),
      query('cityName').isString(),
      query('streetName').isString(),
      query('buildingNumber').isString()
    ];
  }
}
