const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Workflow log validator.
 */
class WorkflowLogValidator extends Validator {
  /**
   * Workflow log validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
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

module.exports = WorkflowLogValidator;
