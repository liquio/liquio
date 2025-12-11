const { checkSchema } = require('express-validator');

const Validator = require('./validator');
const typeOf = require('../lib/type_of');

/**
 * Localization language validator.
 */
class LocalizationLanguageValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!LocalizationLanguageValidator.singleton) {
      LocalizationLanguageValidator.singleton = this;
    }
    return LocalizationLanguageValidator.singleton;
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
      ['filters.code']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  create() {
    return checkSchema({
      ['code']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
      ['name']: {
        in: ['body'],
        optional: false,
        custom: {
          options: (v) => typeOf(v) === 'object',
        },
      },
      ['isActive']: {
        in: ['body'],
        isBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  update() {
    return checkSchema({
      ['code']: {
        in: ['params'],
        optional: false,
        isString: true,
      },
      ['name']: {
        in: ['body'],
        optional: true,
        custom: {
          options: (v) => typeOf(v) === 'object',
        },
      },
      ['isActive']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  delete() {
    return checkSchema({
      ['code']: {
        in: ['params'],
        optional: false,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  export() {
    return checkSchema({
      ['codes']: {
        in: ['body'],
        isArray: true,
        custom: {
          options: (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === 'string'),
        },
      },
    });
  }

  /**
   * Schema.
   */
  import() {
    return checkSchema({
      ['force']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }
}

module.exports = LocalizationLanguageValidator;
