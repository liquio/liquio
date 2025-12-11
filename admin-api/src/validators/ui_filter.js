const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * UI Filter validator.
 */
class UIFilterValidator extends Validator {
  /**
   * Workflow validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!UIFilterValidator.singleton) {
      UIFilterValidator.singleton = this;
    }
    return UIFilterValidator.singleton;
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
      ['sort.name']: {
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
      ['filters.name']: {
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
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['filter']: {
        in: ['body'],
        isString: true,
        custom: {
          options: (value) => {
            if (/^tasks(\.(my|unit))?(\.(opened|closed))?(\.template=[0-9]+(,*[0-9]+)*)?$/.test(value)) {
              return true;
            } else if (
              /^workflows(\.(draft|not-draft))?(\.(ordered-by-myself|ordered-by-unit|observed-by-unit))?(\.template=[0-9]+(,*[0-9]+)*)?$/.test(value)
            ) {
              return true;
            }

            return false;
          },
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
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['filter']: {
        in: ['body'],
        isString: true,
        custom: {
          options: (value) => {
            if (/^tasks(\.(my|unit))?(\.(opened|closed))?(\.template=[0-9]+(,*[0-9]+)*)?$/.test(value)) {
              return true;
            } else if (
              /^workflows(\.(draft|not-draft))?(\.(ordered-by-myself|ordered-by-unit|observed-by-unit))?(\.template=[0-9]+(,*[0-9]+)*)?$/.test(value)
            ) {
              return true;
            }

            return false;
          },
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
  delete() {
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
  findById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }
}

module.exports = UIFilterValidator;
