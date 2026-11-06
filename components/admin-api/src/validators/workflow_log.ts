import { checkSchema } from 'express-validator';

import { ValidationConfig, Validator } from './validator';

/**
 * Workflow log validator.
 */
export class WorkflowLogValidator extends Validator {
  static singleton: WorkflowLogValidator;

  /**
   * Workflow log validator constructor.
   */
  constructor(validationConfig: ValidationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!WorkflowLogValidator.singleton) {
      WorkflowLogValidator.singleton = this;
    }
    return WorkflowLogValidator.singleton;
  }

  /**
   * Schema.
   */
  getWorkflowLogsByWorkflowId() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  reindexStatistics() {
    return checkSchema({
      ['bucketSize']: {
        in: ['query'],
        optional: true,
        isString: true,
        isIn: {
          options: [['minute', 'hour', 'day']],
          errorMessage: 'Invalid value for bucketSize. Must be one of: minute, hour, day',
        },
      },
      ['timeFrom']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['timeTo']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
    });
  }
}
