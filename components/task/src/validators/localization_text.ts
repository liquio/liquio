
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Localization text validator.
 */
export class LocalizationTextValidator extends Validator {
  private static singleton: LocalizationTextValidator;

  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor (validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!LocalizationTextValidator.singleton) {
      LocalizationTextValidator.singleton = this;
    }
    return LocalizationTextValidator.singleton;
  }

  /**
   * Schema.
   */
  getAll () {
    return checkSchema({
      ['filters.localization_language_code']: {
        in: ['query'],
        optional: true,
        isString: true
      },
      ['filters.key']: {
        in: ['query'],
        optional: true,
        isString: true
      }
    });
  }
}

