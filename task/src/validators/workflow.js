
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Workflow validator.
 */
class WorkflowValidator extends Validator {
  /**
   * Workflow validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!WorkflowValidator.singleton) {
      WorkflowValidator.singleton = this;
    }
    return WorkflowValidator.singleton;
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
        toInt: true
      },
      ['count']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.is_final']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.created_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.workflow_template.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.workflow_status_id']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.tasks.finished_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.tasks.created_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.tasks.updated_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.documents.updated_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['filters.name']: {
        in: ['query'],
        optional: true
      },
      ['filters.search']: {
        in: ['query'],
        optional: true
      },
      ['filters.is_final']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.workflow_status_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['filters.is_draft']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.tasks.deleted']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.workflow_template_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['filters.tasks.is_system']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      }
    });
  }

  /**
   * Schema.
   */
  getAllElasticFiltered() {
    return checkSchema({
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
      ['sort']: {
        in: ['query'],
        optional: true
      },
      ['filters']: {
        in: ['query'],
        optional: true
      }
    });
  }

}

module.exports = WorkflowValidator;
