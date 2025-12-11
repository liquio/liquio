const { checkSchema } = require('express-validator');

const Validator = require('./validator');

/**
 * Unit validator.
 */
class UnitValidator extends Validator {
  /**
   * Unit validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!UnitValidator.singleton) {
      UnitValidator.singleton = this;
    }
    return UnitValidator.singleton;
  }

  /**
   * Schema.
   */
  getAllWithPagination() {
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
      },
      ['filters.name']: {
        in: ['query'],
        optional: true,
      },
      ['filters.based_on']: {
        in: ['query'],
        optional: true,
      },
      ['filters.admin_units']: {
        in: ['query'],
        isBoolean: true,
        toBoolean: true,
        optional: true,
      },
    });
  }

  /**
   * Schema.
   */
  getAll() {
    return checkSchema({
      ['filters.heads.*']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.members.*']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['filters.admin_units']: {
        in: ['query'],
        isBoolean: true,
        toBoolean: true,
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
        custom: {
          options: (value) => {
            if (!value) {
              return Promise.resolve();
            }

            return models.unit.findById(value).then((unit) => {
              if (unit) {
                return Promise.reject('Unit id already exists.');
              }
            });
          },
        },
      },
      ['parentId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['basedOn.*']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
        custom: {
          options: (value) => {
            return models.unit.findByName(value).then((unit) => {
              if (unit) {
                return Promise.reject('Unit already exists.');
              }
            });
          },
        },
      },
      ['description']: {
        in: ['body'],
        isString: true,
      },
      ['members.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['heads.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['data']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['menuConfig']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['allowTokens.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['headsIpn.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['membersIpn.*']: {
        in: ['body'],
        optional: true,
        isString: true,
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
      ['parentId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['basedOn.*']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
        custom: {
          options: (value, { req }) => {
            return models.unit.findByName(value).then((unit) => {
              if (unit && unit.id !== req.params.id) {
                return Promise.reject('Unit already exists.');
              }
            });
          },
        },
      },
      ['description']: {
        in: ['body'],
        isString: true,
      },
      ['members.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['heads.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['data']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['menuConfig']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
      ['allowTokens.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['headsIpn.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['membersIpn.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['previousBasedOn']: {
        in: ['body'],
        custom: {
          options: (value, { req }) => {
            return req.body.basedOn ? !!value : true;
          },
        },
      },
      ['previousMembers']: {
        in: ['body'],
        custom: {
          options: (value, { req }) => {
            return req.body.members ? !!value : true;
          },
        },
      },
      ['previousHeads']: {
        in: ['body'],
        custom: {
          options: (value, { req }) => {
            return req.body.heads ? !!value : true;
          },
        },
      },
      ['previousAllowTokens']: {
        in: ['body'],
        custom: {
          options: (value, { req }) => {
            return req.body.allowTokens ? !!value : true;
          },
        },
      },
      ['previousHeadsIpn']: {
        in: ['body'],
        custom: {
          options: (value, { req }) => {
            return req.body.headsIpn ? !!value : true;
          },
        },
      },
      ['previousMembersIpn']: {
        in: ['body'],
        custom: {
          options: (value, { req }) => {
            return req.body.membersIpn ? !!value : true;
          },
        },
      },
    });
  }

  /**
   * Schema.
   */
  addHeads() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['heads.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  removeHeads() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['heads.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  addMembers() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['members.*']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  removeMembers() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['members.*']: {
        in: ['body'],
        optional: true,
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
      ['.ids']: {
        in: ['body'],
        optional: true,
        isArray: true,
      },
      ['ids.*']: {
        in: ['body'],
        isInt: true,
        toInt: true,
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

  createRules() {
    return checkSchema({
      ['type']: {
        in: ['body'],
        isString: true,
      },
      ['ruleSchema']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
    });
  }

  updateRulesByType() {
    return checkSchema({
      ['type']: {
        in: ['body'],
        isString: true,
      },
      ['ruleSchema']: {
        in: ['body'],
        custom: {
          options: (value) => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          },
        },
      },
    });
  }

  deleteRulesByType() {
    return checkSchema({
      ['type']: {
        in: ['query'],
        isString: true,
      },
    });
  }
}

module.exports = UnitValidator;
