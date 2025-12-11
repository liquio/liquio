const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * SQL Reports  validator.
 */
class SqlReportsValidator extends Validator {
  /**
   * SQL Reports  validator constructor.
   * @param {object} validationConfig Validadtion config object.
   */
  constructor(validationConfig) {
    super(validationConfig);
    return SqlReportsValidator.singleton || (SqlReportsValidator.singleton = this);
  }

  /**
   * CalculateSQL Reports Data schema.
   */
  getSqlReports() {
    return checkSchema({
      ['reportId']: {
        in: ['params'],
        isString: true,
      },
      ['*']: {
        in: ['query'],
        optional: true,
      },
    });
  }
}

module.exports = SqlReportsValidator;
