const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * SQL Reports  validator.
 */
class Stat extends Validator {
  /**
   * SQL Reports  validator constructor.
   * @param {object} validationConfig Validadtion config object.
   */
  constructor(validationConfig) {
    super(validationConfig);
    return Stat.singleton || (Stat.singleton = this);
  }

  /**
   * CalculateSQL Reports Data schema.
   */
  getSqlReports() {
    return checkSchema({
      ['date']: {
        in: ['params'],
        isString: true,
      },
    });
  }
}

module.exports = Stat;
