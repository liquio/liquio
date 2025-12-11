const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Snippets validator.
 */
class SnippetsValidator extends Validator {
  /**
   * Constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!SnippetsValidator.singleton) {
      SnippetsValidator.singleton = this;
    }
    return SnippetsValidator.singleton;
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
  getOne() {
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
  createOne() {
    return checkSchema({
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['type']: {
        in: ['body'],
        isString: true,
      },
      ['snippetGroupName']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['data']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  updateOne() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['snippetGroupName']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['data']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  deleteOne() {
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
      ['idList']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value) {
              return true;
            }
            return global.typeOf(value) === 'array' && value.length && value.every((v) => global.typeOf(v) === 'number');
          },
        },
      },
    });
  }

  /**
   * Schema.
   */
  import() {
    return checkSchema({
      ['isRewrite']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  getAllGroups() {
    return checkSchema({});
  }

  /**
   * Schema.
   */
  getOneGroup() {
    return checkSchema({
      ['name']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  createOneGroup() {
    return checkSchema({
      ['name']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  updateOneGroup() {
    return checkSchema({
      ['nameFromParams']: {
        in: ['params'],
        isString: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  deleteOneGroup() {
    return checkSchema({
      ['name']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}

module.exports = SnippetsValidator;
