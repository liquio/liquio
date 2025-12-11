const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * massMessagesMailing validator.
 */
class MassMessagesMailingValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!MassMessagesMailingValidator.singleton) {
      MassMessagesMailingValidator.singleton = this;
    }
    return MassMessagesMailingValidator.singleton;
  }

  /**
   * Schema.
   */
  send() {
    return checkSchema({
      ['emails_list']: {
        in: ['body'],
        optional: true,
        isArray: true,
      },
      ['user_ids_list']: {
        in: ['body'],
        optional: true,
        isArray: true,
      },
      ['subject']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
      ['full_text']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  getListWithPagination() {
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
      },
      ['filters.initiator_id']: {
        in: ['query'],
        optional: true,
      },
    });
  }
}

module.exports = MassMessagesMailingValidator;
