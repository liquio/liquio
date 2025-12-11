const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Number template validator.
 */
class NumberTemplateValidator extends Validator {
  /**
   * Number template validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!NumberTemplateValidator.singleton) {
      NumberTemplateValidator.singleton = this;
    }
    return NumberTemplateValidator.singleton;
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
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['template']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  import() {
    return checkSchema({});
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
      ['template']: {
        in: ['body'],
        isString: true,
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

  /**
   * Schema.
   */
  export() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }
}

module.exports = NumberTemplateValidator;
