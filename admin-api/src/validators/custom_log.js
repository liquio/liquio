const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Custom log validator.
 */
class CustomLogValidator extends Validator {
  /**
   * Custom log validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!CustomLogValidator.singleton) {
      CustomLogValidator.singleton = this;
    }
    return CustomLogValidator.singleton;
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
      ['sort.name']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.type']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.user_id']: {
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
      ['sort.updated_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['sort.custom.*']: {
        in: ['query'],
        optional: true,
      },
      ['filters.name']: {
        in: ['query'],
        optional: true,
      },
      ['filters.type']: {
        in: ['query'],
        optional: true,
      },
      ['filters.document_id']: {
        in: ['query'],
        optional: true,
      },
      ['filters.ip']: {
        in: ['query'],
        optional: true,
      },
      ['filters.user_id']: {
        in: ['query'],
        optional: true,
      },
      ['filters.user_name']: {
        in: ['query'],
        optional: true,
      },
      ['filters.custom.*']: {
        in: ['query'],
        optional: true,
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
      ['isAppendCustomFields']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }
}

module.exports = CustomLogValidator;
