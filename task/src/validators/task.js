
const { checkSchema } = require('express-validator');
const validatorHelper = require('validator');
const Validator = require('./validator');
const validationCheckSchemaOrderInQuery = {
  in: ['query'],
  optional: true,
  isIn: { options: [['asc', 'desc']] }
};

/**
 * Task validator.
 */
class TaskValidator extends Validator {
  /**
   * Task validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
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
      ['sort.performer_units']: validationCheckSchemaOrderInQuery,
      ['sort.performer_user_names']: validationCheckSchemaOrderInQuery,
      ['sort.performer_usernames']: validationCheckSchemaOrderInQuery,
      ['sort.performer_users']: validationCheckSchemaOrderInQuery,
      ['sort.created_at']: validationCheckSchemaOrderInQuery,
      ['sort.due_date']: validationCheckSchemaOrderInQuery,
      ['sort.finished_at']: validationCheckSchemaOrderInQuery,
      ['sort.document.number']: validationCheckSchemaOrderInQuery,
      ['sort.workflow.number']: validationCheckSchemaOrderInQuery,
      ['sort.meta.*']: validationCheckSchemaOrderInQuery,
      ['filters']: {
        in: ['query'],
        optional: true
      },
      ['filters.name']: {
        in: ['query'],
        optional: true
      },
      ['filters.finished']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.deleted']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.assigned_to']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['me', 'unit']] }
      },
      ['filters.closed_by']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['me', 'unit']] }
      },
      ['filters.search']: {
        in: ['query'],
        optional: true
      },
      ['filters.workflow_name']: {
        in: ['query'],
        optional: true
      },
      ['filters.workflow_created_by']: {
        in: ['query'],
        optional: true
      },
      ['filters.number']: {
        in: ['query'],
        optional: true
      },
      ['filters.task_template_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['filters.task_template_id_list']: {
        in: ['query'],
        optional: true,
        isArray: true,
      },
      ['filters.workflow_template_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['filters.performer_username']: {
        in: ['query'],
        optional: true
      },
      ['filters.without_performer_username']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.labels.*']: {
        in: ['query'],
        optional: true,
        isString: true
      },
      ['filters.meta.*']: {
        in: ['query'],
        optional: true,
        isString: true
      },
      ['filters.due_date_from']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const data = new Date(value);
            return data instanceof Date && !isNaN(data);
          }
        }
      },
      ['filters.due_date_to']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const data = new Date(value);
            return data instanceof Date && !isNaN(data);
          }
        }
      },
      ['filters.is_read']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.is_current']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.is_entry']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
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
    });
  }

  /**
   * Schema.
   */
  setDueDate() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      },
      ['dueDate']: {
        in: ['body'],
        exists: {
          options: {
            checkNull: false,
            checkFalsy: false
          }
        },
        bail: true,
        custom: {
          options: (value) => {
            if (value === null) {
              return true;
            } else if (validatorHelper.isISO8601(value)) {
              return true;
            }
            return false;
          }
        }
      }
    });
  }

  /**
   * Update task metadata validation.
   */
  updateTaskMetadata() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      },
      ['meta']: {
        in: ['body']
      },
      ['override']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      }
    });
  }

  /**
   * Get unread tasks count.
   */
  getUnreadTasksCount() {
    return checkSchema({
      ['sort.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.created_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['filters.name']: {
        in: ['query'],
        optional: true
      },
      ['filters.finished']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.deleted']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['filters.assigned_to']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['me', 'unit']] }
      },
      ['filters.closed_by']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['me', 'unit']] }
      }
    });
  }

  /**
   * Calculate task signers.
   */
  calcSigners() {
    return checkSchema({
      ['signer_request']: {
        in: ['query'],
        isString: true
      }
    });
  }

  /**
   * Check signer access.
   */
  checkSignerAccess() {
    return checkSchema({
      ['signer_request']: {
        in: ['query'],
        isString: true
      }
    });
  }

  /**
   * Create empty task.
   */
  getLastTaskId() {
    return checkSchema({
      ['workflowId']: {
        in: ['params'],
        optional: false,
        isString: true
      },
      ['taskTemplateId']: {
        in: ['params'],
        optional: false,
        isInt: true
      }
    });
  }

  /**
   * Get statistic by unit id.
   */
  getStatisticsByUnitId() {
    return checkSchema({
      ['unit_id']: {
        in: ['body'],
        optional: false,
        isInt: true
      },
      ['group_by']: {
        in: ['body'],
        optional: false,
        isString: true,
        isIn: { options: [['by_template', 'by_status']] }
      },
      ['sort.by']: {
        in: ['body'],
        isArray: true,
        optional: true,
        isIn: { options: [['tasks']] }
      },
      ['sort.order']: {
        in: ['body'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['filters.task_template_id']: {
        in: ['body'],
        optional: true,
        isString: true
      },
      ['filters.performer_users']: {
        in: ['body'],
        optional: true,
        isString: true
      },
      ['filters.task_status']: {
        in: ['body'],
        optional: true,
        isIn: { options: [['finished', 'deleted']] }
      },
      ['filters.is_performers_users_must_be_defined']: {
        in: ['body'],
        optional: true,
        isBoolean: true
      },
      ['filters.date.from']: {
        in: ['body'],
        optional: true,
        isString: true
      },
      ['filters.date.to']: {
        in: ['body'],
        optional: true,
        isString: true
      }
    });
  }

  /**
   * Get statistic by unit id.
   */
  getListByUnitId() {
    return checkSchema({
      ['unit_id']: {
        in: ['body'],
        optional: false,
        isInt: true
      },
      ['page']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['count']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['sort.by']: {
        in: ['body'],
        isArray: true,
        optional: true,
        isIn: { options: [['tasks']] }
      },
      ['sort.order']: {
        in: ['body'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['filters.task_template_id']: {
        in: ['body'],
        optional: true,
        isString: true
      },
      ['filters.performer_users']: {
        in: ['body'],
        optional: true,
        isString: true
      },
      ['filters.task_status']: {
        in: ['body'],
        optional: true,
        isIn: { options: [['finished', 'deleted']] }
      },
      ['filters.is_performers_users_must_be_defined']: {
        in: ['body'],
        optional: true,
        isBoolean: true
      },
      ['filters.date.from']: {
        in: ['body'],
        optional: true,
        isString: true
      },
      ['filters.date.to']: {
        in: ['body'],
        optional: true,
        isString: true
      }
    });
  }

  /**
   * Create task by other system.
   */
  createByOtherSystem() {
    return checkSchema({
      ['workflowTemplateId']: {
        in: ['body'],
        optional: false,
        isString: true
      },
      ['taskTemplateId']: {
        in: ['body'],
        optional: false,
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  findById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isUUID: true
      }
    });
  }
}

module.exports = TaskValidator;
