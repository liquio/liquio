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
  getRegistersWithPagination() {
    return checkSchema({
      ['id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['key_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['offset']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['limit']: {
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
  getRegisters() {
    return checkSchema({});
  }

  /**
   * Schema.
   */
  findRegisterById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  createRegister() {
    return checkSchema({
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['parentId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['meta']: {
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
    });
  }

  /**
   * Schema.
   */
  updateRegisterById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['parentId']: {
        in: ['body'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['meta']: {
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
    });
  }

  /**
   * Schema.
   */
  deleteRegisterById() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  getKeysWithPagination() {
    return checkSchema({
      ['register_id']: {
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
      ['limit']: {
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
  getKeys() {
    return checkSchema({
      ['register_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
    });
  }

  getSyncedKeys() {
    return checkSchema({
      ['ids']: {
        in: ['query'],
        isString: true,
      },
    });
  }

  updateIndexMapping() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['mapping']: {
        in: ['body'],
        custom: {
          options: (value) => {
            try {
              return typeof JSON.parse(value) === 'object';
            } catch {
              return false;
            }
          },
        },
      },
    });
  }

  getAllSyncedKeys() {
    return checkSchema({});
  }

  /**
   * Schema.
   */
  findKeyById() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  createKey() {
    return checkSchema({
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['description']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['schema']: {
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
      ['parentId']: {
        in: ['body'],
        optional: {
          options: {
            nullable: true,
          },
        },
        isInt: true,
        toInt: true,
      },
      ['meta']: {
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
      ['toString']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['toSearchString']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['lock']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['accessMode']: {
        in: ['body'],
        optional: true,
        custom: {
          options: (value) => ['full', 'read_only', 'write_only'].includes(value),
        },
      },
      ['toExport']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['isEncrypted']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  updateKeyById() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isString: true,
      },
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['name']: {
        in: ['body'],
        isString: true,
      },
      ['description']: {
        in: ['body'],
        isString: true,
        optional: true,
      },
      ['schema']: {
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
      ['parentId']: {
        in: ['body'],
        optional: true,
        custom: {
          options: (value) => {
            if (typeof value === 'number' || value === null) {
              return true;
            }
            return false;
          },
        },
      },
      ['meta']: {
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
      ['toString']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['toSearchString']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['lock']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['accessMode']: {
        in: ['body'],
        optional: true,
        custom: {
          options: (value) => ['full', 'read_only', 'write_only'].includes(value),
        },
      },
      ['toExport']: {
        in: ['body'],
        optional: true,
        isString: true,
      },
      ['isEncrypted']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
    });
  }

  /**
   * Schema.
   */
  deleteKeyById() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isString: true,
      },
    });
  }

  /**
   * Schema.
   */
  getRecords() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['register_id']: {
        in: ['query'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['key_id']: {
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
      ['limit']: {
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
  findRecordById() {
    return checkSchema({
      ['record_id']: {
        in: ['params'],
        isString: true,
      },
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
        toInt: true,
      },
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
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
      ['meta']: {
        in: ['body'],
      },
    });
  }

  /**
   * Schema.
   */
  importBulkRecords() {
    return checkSchema({
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['keyId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['background']: {
        in: ['body'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['records']: {
        in: ['body'],
        isArray: true,
      },
    });
  }

  /**
   * Schema.
   */
  updateRecordById() {
    return checkSchema({
      ['record_id']: {
        in: ['params'],
        isString: true,
      },
      ['keyId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
      },
      ['registerId']: {
        in: ['body'],
        isInt: true,
        toInt: true,
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
      ['meta']: {
        in: ['body'],
      },
    });
  }

  /**
   * Schema.
   */
  deleteRecordById() {
    return checkSchema({
      ['record_id']: {
        in: ['params'],
        isString: true,
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
      ['with_data']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['file']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['key_ids']: {
        in: ['query'],
        optional: true,
        isString: true,
        toString: true,
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
      ['rewrite_schema']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['clear_records']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['add_data']: {
        in: ['query'],
        optional: true,
        isBoolean: true,
        toBoolean: true,
      },
      ['file']: {
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
  exportXlsx() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['keyId']: {
        in: ['params'],
        optional: true,
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  importXlsx() {
    return checkSchema({
      ['id']: {
        in: ['params'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['keyId']: {
        in: ['params'],
        optional: true,
        isInt: true,
        toInt: true,
      },
      ['unique']: {
        in: ['query'],
        optional: true,
        isString: true,
      },
      ['clear_records']: {
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
  reindexByKeyId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
    });
  }

  /**
   * Schema.
   */
  afterHandlersReindexByKeyId() {
    return checkSchema({
      ['key_id']: {
        in: ['params'],
        isInt: true,
        toInt: true,
      },
      ['mappings']: {
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
      ['settings']: {
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
    });
  }
}

module.exports = RegisterValidator;
