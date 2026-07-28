
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Custom interface.
 */
export class CustomInterfaceValidator extends Validator {
  private static singleton: CustomInterfaceValidator;

  /**
   * Custom interface constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!CustomInterfaceValidator.singleton) {
      CustomInterfaceValidator.singleton = this;
    }
    return CustomInterfaceValidator.singleton;
  }

  /**
   * Get all.
   */
  getAll() {
    return checkSchema({
      ['route']: {
        in: ['query'],
        isString: true
      }
    });
  }
}

