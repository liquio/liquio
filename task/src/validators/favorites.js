
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Favorites validator.
 */
class FavoritesValidator extends Validator {
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

module.exports = FavoritesValidator;
