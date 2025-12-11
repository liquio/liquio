const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Workflow process validator.
 */
class WorkflowProcessValidator extends Validator {
  /**
   * Workflow process validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!WorkflowProcessValidator.singleton) {
      WorkflowProcessValidator.singleton = this;
    }
    return WorkflowProcessValidator.singleton;
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
      ['brief_info']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['sort.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.workflow_template.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.is_final']: {
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
        isString: true,
      },
      ['filters.workflow_template_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
      },
      ['filters.is_final']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['filters.created_by']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.created_date']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.from_created_at']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.to_created_at']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.from_updated_at']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.to_updated_at']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.workflow_status_id']: {
        in: ['query'],
        optional: true,
      },
      ['filters.workflow_status']: {
        in: ['query'],
        optional: true,
      },
      ['filters.name']: {
        in: ['query'],
        optional: true,
      },
      ['filters.user_data']: {
        in: ['query'],
        optional: true,
      },
      ['filters.workflow_template']: {
        in: ['query'],
        optional: true,
      },
      ['filters.task_template_id']: {
        in: ['query'],
        optional: true,
      },
      ['filters.event_template_id']: {
        in: ['query'],
        optional: true,
      },
      ['filters.gateway_template_id']: {
        in: ['query'],
        optional: true,
      },
      ['filters.number']: {
        in: ['query'],
        optional: true,
      },
      ['filters.type']: {
        in: ['query'],
        optional: true,
      },
      ['filters.has_errors']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['filters.has_unresolved_errors']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['filters.is_draft']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['filters.statuses']: {
        in: ['query'],
        optional: true,
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
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  continueProcess() {
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
  continueProcessBulk() {
    return checkSchema({
      ['workflowIds.*']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  restartProcessFromStep() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['message']: {
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
      ['resolve_error']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  restartProcessFromStepBulk() {
    return checkSchema({
      ['messages']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!Array.isArray(value) || value.some((v) => typeof v !== 'object')) {
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
  clearProcess() {
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
      ['hasUnresolvedErrors']: {
        in: ['body'],
        isBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  getTasks() {
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
        isString: true,
      },
      ['filters.document_id']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.user_ids.*']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.user_id_list']: {
        in: ['query'],
        optional: true,
      },
    });
  }

  /**
   * Schema.
   */
  updateTask() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['taskId']: {
        in: ['params'],
        isString: true,
      },
      ['finished']: {
        in: ['body'],
        isBoolean: true,
      },
      ['document.isFinal']: {
        in: ['body'],
        isBoolean: true,
      },
      ['document.data']: {
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
    });
  }

  /**
   * Schema.
   */
  cancelEvent() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['eventId']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  downloadFile() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['fileId']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  downloadP7s() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['fileId']: {
        in: ['params'],
        isString: true,
      },
      ['as_file']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['as_base64']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  deleteAllSignaturesFromDocument() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['documentId']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}

module.exports = WorkflowProcessValidator;
