const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Workflow category validator.
 */
class ProxyItemValidator extends Validator {
  /**
   * Workflow validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!ProxyItemValidator.singleton) {
      ProxyItemValidator.singleton = this;
    }
    return ProxyItemValidator.singleton;
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
  getAll() {
    return checkSchema({});
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
      ['data']: {
        in: ['body'],
        optional: false,
      },
      ['accessUnits']: {
        in: ['body'],
        optional: true,
        isArray: true,
      },
      ['accessUnits.*']: {
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
      ['data']: {
        in: ['body'],
        optional: false,
      },
      ['accessUnits']: {
        in: ['body'],
        optional: true,
        isArray: true,
      },
      ['accessUnits.*']: {
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
}

module.exports = ProxyItemValidator;
