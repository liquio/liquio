
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Localization language validator.
 */
export class LocalizationLanguageValidator extends Validator {
  private static singleton: LocalizationLanguageValidator;

  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor (validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!LocalizationLanguageValidator.singleton) {
      LocalizationLanguageValidator.singleton = this;
    }
    return LocalizationLanguageValidator.singleton;
  }

  /**
   * Schema.
   */
  getAll () {
    return checkSchema({
      ['filters.code']: {
        in: ['query'],
        optional: true,
        isString: true
      }
    });
  }
}

