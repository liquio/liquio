
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * User inbox validator.
 */
class UserInboxValidator extends Validator {
  /**
   * User inbox validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!UserInboxValidator.singleton) {
      UserInboxValidator.singleton = this;
    }
    return UserInboxValidator.singleton;
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
      ['sort.number']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.is_read']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.created_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['sort.updated_at']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] }
      },
      ['filters.name']: {
        in: ['query'],
        optional: true
      },
      ['filters.number']: {
        in: ['query'],
        optional: true
      },
      ['filters.is_read']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      }
    });
  }
}

module.exports = UserInboxValidator;
