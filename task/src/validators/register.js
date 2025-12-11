
const { checkSchema } = require('express-validator');
const Validator = require('./validator');

/**
 * Register validator.
 */
class RegisterValidator extends Validator {
  /**
   * Register validator constructor.
   * @param {object} validationConfig Validation config object.
   */
  constructor(validationConfig) {
    super(validationConfig);

    // Define singleton.
    if (!RegisterValidator.singleton) {
      RegisterValidator.singleton = this;
    }
    return RegisterValidator.singleton;
  }

  /**
   * Schema.
   */
  getRecordsByKeyId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['strict']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['data']: {
        in: ['query'],
        optional: true
      },
      ['data_like']: {
        in: ['query'],
        optional: true
      },
      ['data_nested']: {
        in: ['query'],
        optional: true
      },
      ['sort']: {
        in: ['query'],
        optional: true
      },
      ['search']: {
        in: ['query'],
        optional: true
      },
      ['search_2']: {
        in: ['query'],
        optional: true
      },
      ['search_3']: {
        in: ['query'],
        optional: true
      },
      ['search_equal']: {
        in: ['query'],
        optional: true
      },
      ['search_equal_2']: {
        in: ['query'],
        optional: true
      },
      ['search_equal_3']: {
        in: ['query'],
        optional: true
      },
      ['residentship_date_from']: {
        in: ['query'],
        optional: true
      },
      ['residentship_date_to']: {
        in: ['query'],
        optional: true
      },
      ['residentship_status_date_from']: {
        in: ['query'],
        optional: true
      },
      ['residentship_status_date_to']: {
        in: ['query'],
        optional: true
      },
      ['data_date_from']: {
        in: ['query'],
        optional: true
      },
      ['data_date_to']: {
        in: ['query'],
        optional: true
      },
      ['created_from']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const data = new Date(value);
            return data instanceof Date && !isNaN(data);
          }
        }
      },
      ['created_to']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const data = new Date(value);
            return data instanceof Date && !isNaN(data);
          }
        }
      },
      ['updated_from']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const data = new Date(value);
            return data instanceof Date && !isNaN(data);
          }
        }
      },
      ['updated_to']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const data = new Date(value);
            return data instanceof Date && !isNaN(data);
          }
        }
      },
    });
  }

  /**
   * Schema.
   */
  search() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['text']: {
        in: ['query'],
        isString: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  getHistoryByKeyId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['operation']: {
        in: ['query'],
        optional: true
      },
      ['record_data_like']: {
        in: ['query'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getViewingHistoryByKeyId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['created_from']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
          }
        }
      },
      ['created_to']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
          }
        }
      }
    });
  }

  /**
   * Schema.
   */
  getHistoryByRecordId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['record_id']: {
        in: ['params'],
        isString: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['operation']: {
        in: ['query'],
        optional: true
      },
      ['split_by_fields']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['split_by_fields_order']: {
        in: ['query'],
        optional: true,
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  getViewingHistoryByRecordId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['record_id']: {
        in: ['params'],
        isString: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['created_from']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
          }
        }
      },
      ['created_to']: {
        in: ['query'],
        optional: true,
        custom: {
          options: (value) => {
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
          }
        }
      }
    });
  }

  /**
   * Schema.
   */
  getFilteredRecordsByKeyId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['strict']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true
      },
      ['data_like']: {
        in: ['query'],
        optional: true
      },
      ['control']: {
        in: ['query'],
        optional: true
      },
      ['control_index']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['search']: {
        in: ['query'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  getRecordsTreeByKeyIds() {
    return checkSchema({
      ['key_ids']: {
        in: ['params'],
        isString: true
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['limit']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true
      },
      ['excludeList']: {
        in: ['query'],
        optional: true
      }
    });
  }

  /**
   * Schema.
   */
  findRecordById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  createRecord() {
    return checkSchema({
      ['keyId']: {
        in: ['body'],
        isInt: true,
        toInt: true
      },
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true
      },
      ['data']: {
        in: ['body'],
        custom: {
          options: value => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          }
        }
      },
      ['meta']: {
        in: ['body']
      },
      ['signature']: {
        in: ['body'],
        custom: {
          options: value => value === null || typeof value === 'string' || typeof value === 'undefined'
        }
      }
    });
  }

  /**
   * Schema.
   */
  updateRecordById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      },
      ['keyId']: {
        in: ['body'],
        isInt: true,
        toInt: true
      },
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true
      },
      ['data']: {
        in: ['body'],
        custom: {
          options: value => {
            if (!value || typeof value !== 'object') {
              return false;
            }
            return true;
          }
        }
      },
      ['meta']: {
        in: ['body']
      },
      ['signature']: {
        in: ['body'],
        custom: {
          options: value => value === null || typeof value === 'string' || typeof value === 'undefined'
        }
      }
    });
  }

  /**
   * Schema.
   */
  deleteRecordById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  startRollback() {
    return checkSchema({
      ['keyId']: {
        in: ['body'],
        isInt: true,
        toInt: true
      },
      ['timePoint']: {
        in: ['body'],
        custom: {
          options: (value) => {
            const timeRegExp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}).(\d{3}))?Z$/;
            return timeRegExp.test(value);
          }
        }
      }
    });
  }

  /**
   * Schema.
   */
  getRollbackStatusWithDetails() {
    return checkSchema({
      ['rollbackId']: {
        in: ['params'],
        isString: true
      }
    });
  }

  /**
   * Schema.
   */
  rollbackRecord() {
    return checkSchema({
      ['historyId']: {
        in: ['body'],
        isString: true
      },
      ['recordId']: {
        in: ['body'],
        isString: true
      },
      ['keyId']: {
        in: ['body'],
        isInt: true,
        toInt: true
      }
    });
  }

}

module.exports = RegisterValidator;
