import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Favorites validator.
 */
export class FavoritesValidator extends Validator {
  static singleton: FavoritesValidator;

  /**
   * Favorites validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    return FavoritesValidator.singleton || (FavoritesValidator.singleton = this);
  }

  /**
   * Validator default params.
   */
  default() {
    return checkSchema({
      ['entity_type']: {
        in: ['params', 'body'],
        isString: true,
      },
      ['entity_id']: {
        in: ['params', 'body'],
        isString: true,
        optional: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
    });
  }
}
