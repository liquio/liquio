
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Favorites validator.
 */
export class FavoritesValidator extends Validator {
  private static singleton: FavoritesValidator;

  /**
   * Favorites validator constructor.
   * @param {object} validationConfig Validadtion config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    return FavoritesValidator.singleton || ( FavoritesValidator.singleton = this );
  }

  /**
   * validator default params.
   */
  default() {
    return checkSchema({
      ['entity_type']: {
        in: ['params'],
        isString: true,
      },
      ['entity_id']: {
        in: ['params'],
        isString: true,
        optional: true,
      },
    });
  }
}

