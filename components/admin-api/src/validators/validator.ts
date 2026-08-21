export type ValidationConfig = object;

/**
 * Validator.
 */
export class Validator {
  public validationConfig: ValidationConfig;

  /**
   * Validator constructor.
   * @param {ValidationConfig} validationConfig Validation config object.
   */
  constructor(validationConfig: ValidationConfig) {
    this.validationConfig = validationConfig;
  }
}
