import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Protected file validator.
 */
export class ProtectedFileValidator extends Validator {
  private static singleton: ProtectedFileValidator;

  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!ProtectedFileValidator.singleton) {
      ProtectedFileValidator.singleton = this;
    }
    return ProtectedFileValidator.singleton;
  }

  /**
   * Schema for open.
   */
  open() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['record_id']: {
        in: ['params'],
        isUUID: true
      },
      ['path']: {
        in: ['query'],
        isString: true,
      },
      ['preview']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['p7s']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      }
    });
  }

  /**
   * Schema for upload protected file.
   */
  uploadProtectedFile() {
    return checkSchema({
      ['file_name']: {
        in: ['query'],
        isString: true
      },
    });
  }

}

