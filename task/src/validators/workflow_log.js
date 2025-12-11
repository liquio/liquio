
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
  findById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getWorkflows() {
    return checkSchema({
      ['workflow_template_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['from_created_at']: {
        in: ['query'],
        optional: true,
        isString: true
      },
      ['to_created_at']: {
        in: ['query'],
        optional: true,
        isString: true
      },
      ['page']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['count']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      }
    });
  }

  /**
   * Schema.
   */
  getWorkflowsByUpdatedAt() {
    return checkSchema({
      ['date']: {
        in: ['query'],
        optional: false,
        isString: true
      },
      ['workflow_template_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['page']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['count']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort.updated_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      }
    });
  }
}

module.exports = WorkflowLogValidator;
