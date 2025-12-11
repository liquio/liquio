/**
 * Validator error.
 */
export default class ValidatorError {
  dataPath: string;
  validationParam: string;
  message: string;

  /**
   * Validation error constructor.
   * @param {object} ajvError AJV error.
   */
  constructor(ajvError) {
    // Define params.
    this.dataPath = ajvError.dataPath.slice(1);
    this.validationParam = Object.values(ajvError.params)[0] as string;
    this.message = ajvError.message;
  }
}
