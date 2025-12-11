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
        toInt: true,
      },
      ['count']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['sort.id']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.workflow_template_category_id']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.workflow_template_category.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.created_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.updated_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['filters.id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['filters.workflow_template_category_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['filters.exclude_workflow_template_category_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['filters.name']: {
        in: ['query'],
        optional: true,
      },
      ['filters.tags']: {
        in: ['query'],
        optional: true,
        isArray: true,
      },
      ['short']: {
        in: ['query'],
        optional: true,
        toBoolean: true,
      },
      ['filters.errors_subscribers']: {
        in: ['query'],
        optional: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  getAllBySchemaSearch() {
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
      ['filters.search']: {
        in: ['query'],
        optional: true,
      },
      ['options.regex_as_string']: {
        in: ['query'],
        optional: true,
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
        toInt: true,
      },
      ['workflowTemplateCategoryId']: {
        in: ['body'],
        optional: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['xmlBpmnSchema']: {
        in: ['body'],
        isString: true,
      },
      ['data']: {
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
      ['isActive']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['accessUnits.*']: {
        in: ['body'],
        optional: true,
        isInt: true,
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
      ['workflowTemplateCategoryId']: {
        in: ['body'],
        optional: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['xmlBpmnSchema']: {
        in: ['body'],
        isString: true,
      },
      ['data']: {
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
      ['isActive']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['accessUnits.*']: {
        in: ['body'],
        optional: true,
        isInt: true,
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

  reindexList() {
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
      ['sort.id']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.user_name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.created_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
    });
  }

  reindexForPeriod() {
    return checkSchema({
      ['fromCreatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['toCreatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['fromUpdatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['toUpdatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  manualReindexForPeriod() {
    return checkSchema({
      ['fromCreatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['toCreatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['fromUpdatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['toUpdatedAt']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['skipErrors']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
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

  /**
   * Schema.
   */
  subscribeOnWorkflowErrors() {
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
  unsubscribeFromWorkflowErrors() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }

  setTags() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['tagIds']: {
        in: ['body'],
        isArray: true,
      },
    });
  }
}

module.exports = WorkflowValidator;
