import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Workflow category validator.
 */
export class WorkflowCategoryValidator extends Validator {
  static singleton: WorkflowCategoryValidator;

  /**
   * Workflow validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!WorkflowCategoryValidator.singleton) {
      WorkflowCategoryValidator.singleton = this;
    }
    return WorkflowCategoryValidator.singleton;
  }

  /**
   * Schema.
   */
  getAll() {
    return checkSchema({
      ['page']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['count']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  create() {
    return checkSchema({
      ['id']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['parentId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
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
        isInt: true,
        toInt: true,
      },
      ['parentId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['name']: {
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
