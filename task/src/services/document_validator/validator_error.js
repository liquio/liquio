/**
 * Validator error.
 */
class ValidatorError {
  /**
   * Validation error constructor.
   * @param {object} ajvError AJV error.
   */
  constructor(ajvError) {
    // Define params.
    this.dataPath = ajvError.dataPath.slice(1);
    this.validationParam = Object.values(ajvError.params)[0];
    this.message = ajvError.message;
  }
}

module.exports = ValidatorError;
