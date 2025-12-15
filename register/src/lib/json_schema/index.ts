import Ajv from 'ajv';

import ValidatorError from './validator_error';
import RecordModel from '../../models/record';
import Isolation from '../isolation';

/**
 * JSON schema.
 */
export default class JsonSchema {
  recordModel: RecordModel;
  ajv: Ajv.Ajv;
  schema: any;
  validation: any;

  constructor(schema) {
    this.recordModel = RecordModel.getInstance();

    // Define params.
    this.ajv = new Ajv();

    // Use custom function if need it.
    if (schema.customTypes && Object.keys(schema.customTypes).length > 0) {
      Object.entries(schema.customTypes).forEach(([keyWord, func]) => {
        this.ajv.addKeyword(keyWord, {
          compile: (currentKeyWordValueInSchema, curentFieldInSchema) => (recordFieldValue) => {
            const isolate = new Isolation();
            isolate
              .set('recordFieldValue', recordFieldValue)
              .set('currentKeyWordValueInSchema', currentKeyWordValueInSchema)
              .set('curentFieldInSchema', curentFieldInSchema);
            return isolate.eval(`(${func as string})(recordFieldValue, currentKeyWordValueInSchema, curentFieldInSchema)`);
          }
        });
      });
    }

    // Remove field from schema.
    delete schema.customTypes;

    this.schema = schema;
    this.validation = this.ajv.compile(schema);
  }

  /**
   * Check.
   * @param {object} objectToCheck Object to check.
   * @param {number} keyId Key ID.
   * @param {string} [recordId] Record ID.
   * @returns {Promise<ValidatorError[]>} Validator errors list promise.
   */
  async check(objectToCheck, keyId, recordId?) {
    // Check is valid.
    this.validation(objectToCheck);

    // Check standart AJV errors.
    const ajvErrors = this.validation.errors || [];

    // Return all errors array.
    const validatorErrors = ajvErrors.map((v) => new ValidatorError(v));

    // Check unique parameter.
    const jsonFieldsToSearch = [];
    for (const key in this.schema.properties) {
      if (this.schema.properties.hasOwnProperty(key)) {
        if (this.schema.properties[key].unique) {
          const value = objectToCheck[key];
          jsonFieldsToSearch.push({ [key]: value });
        }
      }
    }
    if (jsonFieldsToSearch.length > 0) {
      const records = await this.recordModel.countByJsonFields(keyId, jsonFieldsToSearch, recordId);
      if (records > 0) validatorErrors.push({ message: 'Unique error.' });
    }

    // Remove records to ignore.
    const errorsWithoutRecordsToIgnore = validatorErrors.filter((v) => !this.isValidationErrorShouldBeIgnored(v));

    // Return errors without records to ignore.
    return errorsWithoutRecordsToIgnore;
  }

  /**
   * Is validation should be ignored.
   * @param {ValidatorError} validatorError Validator error.
   * @returns {boolean} Is validation should be ignored indicator.
   */
  // eslint-disable-next-line no-unused-vars
  isValidationErrorShouldBeIgnored(_validatorError) {
    // Return false. Change here to ignore some errors.
    return false;
  }
}
