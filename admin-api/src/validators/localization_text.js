const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Localization text validator.
 */
class LocalizationTextValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!LocalizationTextValidator.singleton) {
      LocalizationTextValidator.singleton = this;
    }
    return LocalizationTextValidator.singleton;
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
      ['filters.localization_language_code']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.key']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  getListByKeysWithPagination() {
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
      ['sort.key']: {
        in: ['query'],
        optional: true,
        isIn: { options: [['asc', 'desc']] },
      },
      ['filters.key']: {
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
      ['localizationLanguageCode']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
      ['key']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
      ['value']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  update() {
    return checkSchema({
      ['localization_language_code']: {
        in: ['params'],
        optional: false,
        isString: true,
      },
      ['key']: {
        in: ['params'],
        optional: false,
        isString: true,
      },
      ['value']: {
        in: ['body'],
        optional: false,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  delete() {
    return checkSchema({
      ['localization_language_code']: {
        in: ['params'],
        optional: false,
        isString: true,
      },
      ['key']: {
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
      ['texts']: {
        in: ['body'],
        isArray: true,
        custom: {
          options: (v) => Array.isArray(v) && v.length > 0,
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

module.exports = LocalizationTextValidator;
