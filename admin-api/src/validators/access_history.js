const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Access history validator.
 */
class AccessHistoryValidator extends Validator {
  /**
   * Access history validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!AccessHistoryValidator.singleton) {
      AccessHistoryValidator.singleton = this;
    }
    return AccessHistoryValidator.singleton;
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
      ['filters.init_ipn']: {
        in: ['query'],
        optional: true,
        isInt: true,
      },
      ['filters.init_user_id']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.init_user_name']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.init_workflow_id']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.ipn']: {
        in: ['query'],
        optional: true,
        isInt: true,
      },
      ['filters.operation_type']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.unit_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
      },
      ['filters.unit_name']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.user_id']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.user_name']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.from_created_at']: {
        in: ['query'],
        optional: true,
        isISO8601: true,
      },
      ['filters.to_created_at']: {
        in: ['query'],
        optional: true,
        isISO8601: true,
      },
    });
  }
}

module.exports = AccessHistoryValidator;
