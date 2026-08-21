
import { checkSchema } from 'express-validator';
import { Validator } from './validator';

/**
 * Document validator.
 */
export class DocumentValidator extends Validator {
  private static singleton: DocumentValidator;

  /**
   * Task validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!DocumentValidator.singleton) {
      DocumentValidator.singleton = this;
    }
    return DocumentValidator.singleton;
  }

  /**
   * Schema.
   */
  addAttachment() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isUUID: true
      },
      ['file_name']: {
        in: ['query'],
        isString: true
      },
    });
  }
}

