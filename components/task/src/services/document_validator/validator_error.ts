/**
 * Validator error.
 */
export class ValidatorError {
  dataPath: any;
  message: any;
  validationParam: any;

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
