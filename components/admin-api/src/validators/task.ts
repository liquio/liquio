import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Task validator.
 */
export class TaskValidator extends Validator {
  static singleton: TaskValidator;

  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!TaskValidator.singleton) {
      TaskValidator.singleton = this;
    }
    return TaskValidator.singleton;
  }

  /**
   * Schema.
   */
  create() {
    return checkSchema({
      ['.']: {
        in: ['body'],
        isArray: true,
      },
      ['*.workflowTemplateId']: {
        in: ['body'],
        toInt: true,
      },
      ['*.taskTemplate.id']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['*.taskTemplate.name']: {
        in: ['body'],
        isString: true,
      },
      ['*.taskTemplate.documentTemplateId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['*.taskTemplate.jsonSchema']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['*.taskTemplate.jsonSchemaRaw']: {
        in: ['body'],
        isString: true,
      },
      ['*.taskTemplate.htmlTemplate']: {
        in: ['body'],
        isString: true,
      },
      ['*.documentTemplate.id']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['*.documentTemplate.name']: {
        in: ['body'],
        isString: true,
      },
      ['*.documentTemplate.jsonSchema']: {
        in: ['body'],
        optional: true,
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['*.documentTemplate.jsonSchemaRaw']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['*.documentTemplate.htmlTemplate']: {
        in: ['body'],
        isString: true,
      },
      ['*.documentTemplate.accessJsonSchema']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['*.documentTemplate.additionalDataToSign']: {
        in: ['body'],
        optional: {
          options: {
            nullable: true,
          },
        },
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
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  findById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }
}
