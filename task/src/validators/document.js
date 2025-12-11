
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Document validator.
 */
class DocumentValidator extends Validator {
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
        optional: false,
        isString: true
      },
    });
  }
}

module.exports = DocumentValidator;
