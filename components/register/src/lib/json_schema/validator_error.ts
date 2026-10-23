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
    // AJV v8 uses `instancePath`, while older payloads may still use `dataPath`.
    const rawPath =
      (typeof ajvError?.instancePath === 'string' && ajvError.instancePath) || (typeof ajvError?.dataPath === 'string' && ajvError.dataPath) || '';

    this.dataPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    const firstValidationParam = Object.values(ajvError?.params || {})[0];
    this.validationParam = typeof firstValidationParam === 'string' ? firstValidationParam : String(firstValidationParam || '');
    this.message = typeof ajvError?.message === 'string' ? ajvError.message : 'Validation error.';
  }
}
