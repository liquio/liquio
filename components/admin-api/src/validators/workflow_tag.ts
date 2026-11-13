import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Workflow log validator.
 */
export class WorkflowTagValidator extends Validator {
  static singleton: WorkflowTagValidator;

  /**
   * Workflow log validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!WorkflowTagValidator.singleton) {
      WorkflowTagValidator.singleton = this;
    }
    return WorkflowTagValidator.singleton;
  }

  getAll() {
    return checkSchema({
      ['currentPage']: {
        in: ['query'],
        isInt: true,
        toInt: true,
        optional: true,
      },
      ['pageSize']: {
        in: ['query'],
        isInt: true,
        toInt: true,
        optional: true,
      },
      ['search']: {
        in: ['query'],
        isString: true,
        optional: true,
      },
      ['short']: {
        in: ['query'],
        isBoolean: true,
        optional: true,
      },
    });
  }

  create() {
    return checkSchema({
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['color']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
    });
  }

  findById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  update() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['color']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
    });
  }

  delete() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}
