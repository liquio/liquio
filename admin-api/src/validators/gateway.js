const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Gateway validator.
 */
class GatewayValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!GatewayValidator.singleton) {
      GatewayValidator.singleton = this;
    }
    return GatewayValidator.singleton;
  }

  /**
   * Schema.
   */
  create() {
    return checkSchema({
      ['.']: {
        in: ['body'],
        isArray: true,
      },
      ['*.workflowTemplateId']: {
        in: ['body'],
        toInt: true,
      },
      ['*.id']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['*.gatewayTypeId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['*.name']: {
        in: ['body'],
        isString: true,
      },
      ['*.description']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['*.jsonSchema']: {
        in: ['body'],
        optional: true,
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['*.jsonSchemaRaw']: {
        in: ['body'],
        isString: true,
        optional: true,
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

module.exports = GatewayValidator;
