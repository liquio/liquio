const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Custom interface validator.
 */
class CustomInterfaceValidator extends Validator {
  /**
   * Workflow validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!CustomInterfaceValidator.singleton) {
      CustomInterfaceValidator.singleton = this;
    }
    return CustomInterfaceValidator.singleton;
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
      ['route']: {
        in: ['body'],
        isString: true,
      },
      ['isActive']: {
        in: ['body'],
        isBoolean: true,
      },
      ['interfaceSchema']: {
        in: ['body'],
        isString: true,
      },
      ['units.*']: {
        in: ['body'],
        optional: true,
        isInt: true,
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
      ['route']: {
        in: ['body'],
        isString: true,
      },
      ['isActive']: {
        in: ['body'],
        isBoolean: true,
      },
      ['interfaceSchema']: {
        in: ['body'],
        isString: true,
      },
      ['units.*']: {
        in: ['body'],
        optional: true,
        isInt: true,
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

module.exports = CustomInterfaceValidator;
