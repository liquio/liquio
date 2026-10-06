import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Message template validator.
 */
export class MessageTemplateValidator extends Validator {
  static singleton: MessageTemplateValidator;

  /**
   * Constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!MessageTemplateValidator.singleton) {
      MessageTemplateValidator.singleton = this;
    }
    return MessageTemplateValidator.singleton;
  }

  /**
   * Schema.
   */
  create() {
    return checkSchema({
      ['type']: {
        in: ['body'],
        isString: true,
      },
      ['text']: {
        in: ['body'],
        isString: true,
      },
      ['title']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  delete() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  update() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['type']: {
        in: ['body'],
        isString: true,
      },
      ['text']: {
        in: ['body'],
        isString: true,
      },
      ['title']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  export() {
    return checkSchema({
      ['template_ids']: {
        in: ['query'],
        isArray: true,
        optional: true,
        custom: {
          options: (value) => {
            if (!value) {
              return true;
            }
            if (!Array.isArray(value)) {
              return false;
            }
            if (value.some((el) => isNaN(Number(el)))) {
              return false;
            }
            return true;
          },
        },
      },
    });
  }

  /**
   * Schema.
   */
  import() {
    return checkSchema({
      ['rewriteTemplateIds']: {
        in: ['query'],
        isArray: true,
        optional: true,
        custom: {
          options: (value) => {
            if (!value) {
              return true;
            }
            if (!Array.isArray(value)) {
              return false;
            }
            if (value.some((el) => isNaN(Number(el)))) {
              return false;
            }
            return true;
          },
        },
      },
    });
  }
}
