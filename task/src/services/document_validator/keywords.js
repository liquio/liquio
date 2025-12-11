
const _ = require('lodash');

const { JSONPath } = require('../../lib/jsonpath');
const Sandbox = require('../../lib/sandbox');

// Constants.
const KEYWORD_CHECK_VALID = 'checkValid';
const KEYWORD_CHECK_REQUIRED = 'checkRequired';
const KEYWORD_HTML_MIN_LENGTH = 'htmlMinLength';
const KEYWORD_HTML_MAX_LENGTH = 'htmlMaxLength';
const KEYWORD_CONTROL = 'control';
const MASK_VALUE_ERROR = 'Value is not matching to mask';

/**
 * Keywords.
 */
class Keywords {
  static sandbox = new Sandbox();

  /**
   * Check.
   * @param {any} propertyData Property data.
   * @param {object} propertySchema Property schema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @param {object} externalFunctions External functions.
   */
  static async check(
    propertyData,
    propertySchema,
    pageObject,
    documentDataObject,
    externalFunctions
  ) {
    // Define errors list.
    const errors = (await Promise.all(
      Keywords.checkers.map(
        async checker =>
          await checker(
            propertyData,
            propertySchema,
            pageObject,
            documentDataObject,
            externalFunctions
          )
      )
    )).filter(error => error !== '');
    // Return errors container.
    return errors;
  }

  /**
   * Checkers.
   * @returns {function[]} Checkers list.
   */
  static get checkers() {
    return [
      Keywords.checkValid,
      Keywords.checkRequired,
      Keywords.htmlMinLength,
      Keywords.htmlMaxLength,
      Keywords.checkboxesTree,
      Keywords.checkMasks,
      Keywords.checkVerifiedUserInfo,
      // Keywords.options,
      // Keywords.formGroupOptions,
      // Keywords.units,
      // Keywords.register,
      // Keywords.treeSelect
      // Keywords.relatedSelects
    ];
  }

  /**
   * Check "checkValid". Should return true if valid.
   * @param {any} propertyData Property data.
   * @param {object} propertySchema Property schema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @returns {string} Error text.
   */
  static async checkValid(propertyData, propertySchema, pageObject, documentDataObject) {
    // Define keyword.
    const keywordData = propertySchema && propertySchema[KEYWORD_CHECK_VALID];
    if (typeof keywordData === 'undefined') {
      return '';
    }

    // Correct if property not defined. Use `checkRequired` if need it.
    if (typeof propertyData === 'undefined') {
      return '';
    }

    // Check accordance to keyword.
    try {
      // Handle if not array.
      if (!Array.isArray(keywordData)) {
        const isCorrect = Keywords.sandbox.eval(keywordData)(propertyData, pageObject, documentDataObject);
        return isCorrect ? '' : 'checkValid error.';
      }

      // Handler if array.
      for (const keywordDataItem of keywordData) {
        const { isValid, errorText } = keywordDataItem;

        // Replace `propertyData.isSuccess` to `propertyData?.processed?.some(v => v?.status?.isSuccess === 1)`.
        if (propertySchema.control === 'payment.widget.new' || propertySchema.control === 'payment.widget' || propertySchema.control === 'payment') {
          if (/\.isSuccess/.test(isValid)) {
            propertyData.isSuccess =
              propertyData?.processed?.some((v) => v?.status?.isSuccess === 1) || false;
          }
        }

        const isCorrect = Keywords.sandbox.eval(isValid)(propertyData, pageObject, documentDataObject);
        if (!isCorrect) { return `checkValid error (${errorText || isValid}).`; }
      }
      return '';
    } catch (error) {
      log.save('json-schema-validation-exception|check-valid', { error: error && error.message });
      return '';
    }
  }

  /**
   * Check "checkRequired". Should return true if valid.
   * @param {any} propertyData Property data.
   * @param {object} propertySchema Property schema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @returns {string} Error text.
   */
  static async checkRequired(propertyData, propertySchema, pageObject, documentDataObject) {
    // Define keyword.
    const keywordData = propertySchema && propertySchema[KEYWORD_CHECK_REQUIRED];
    if (typeof keywordData === 'undefined') {
      return '';
    }

    // Replace `propertyData.isSuccess` to `propertyData?.processed?.some(v => v?.status?.isSuccess === 1)`.
    if (propertySchema.control === 'payment.widget.new' || propertySchema.control === 'payment.widget' || propertySchema.control === 'payment') {
      if (/\.isSuccess/.test(keywordData) && typeof propertyData !== 'undefined') {
        propertyData.isSuccess =
          propertyData?.processed?.some((v) => v?.status?.isSuccess === 1) || false;
      }
    }

    // Check accordance to keyword.
    const isRequired = Keywords.sandbox.eval(keywordData)(propertyData, pageObject, documentDataObject);
    const noData = typeof propertyData === 'undefined';

    return isRequired && noData ? 'checkRequired error.' : '';
  }

  /**
   * Check "htmlMinLength".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema Property schema.
   * @returns {string} Error text.
   */
  static async htmlMinLength(propertyData, propertySchema) {
    // Define keyword.
    const keywordData = propertySchema && propertySchema[KEYWORD_HTML_MIN_LENGTH];
    if (typeof keywordData === 'undefined') {
      return '';
    }

    // Check accordance to keyword.
    const isCorrect =
      (propertyData || '').replace(/<\/?[^>]+>/g, '').length >= keywordData;
    return isCorrect ? '' : 'HTML min length error.';
  }

  /**
   * Check "htmlMaxLength".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema
   * @returns {string} Error text.
   */
  static async htmlMaxLength(propertyData, propertySchema) {
    // Define keyword.
    const keywordData = propertySchema && propertySchema[KEYWORD_HTML_MAX_LENGTH];
    if (typeof keywordData === 'undefined') {
      return '';
    }

    // Check accordance to keyword.
    const isCorrect =
      (propertyData || '').replace(/<\/?[^>]+>/g, '').length <= keywordData;
    return isCorrect ? '' : 'HTML max length error.';
  }

  /**
   * Check "checkboxesTree".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @returns {string} Error text.
   */
  static async checkboxesTree(propertyData, propertySchema) {
    // Define keyword.
    const keywordControl = propertySchema[KEYWORD_CONTROL];
    if (keywordControl !== 'checkboxesTree') {
      return '';
    }

    // Check accordance to keyword.
    const isCorrect = await Keywords.checkCheckboxesTree(propertySchema, propertyData);
    return isCorrect === -1 ? 'Checkboxes tree schema error.' : '';
  }

  /**
   * Recursive function to check property data with checkboxes tree schema.
   * @param {object} obj Property schema.
   * @param {object} data From user.
   * @returns {number} Sum of selected items or -1 if no items are selected.
   */
  static async checkCheckboxesTree(schema, data) {
    const isLevel = Object.prototype.hasOwnProperty.call(schema, 'tree');
    let sum = 0;
    if (isLevel) {
      for (const innerTree of schema.tree) {
        const res = await Keywords.checkCheckboxesTree(innerTree, data);
        if (res === -1) return -1;
        sum += res;
      }
      if (sum < (schema.minSelected || -Infinity) || sum > (schema.maxSelected || Infinity)) {
        return -1;
      }
    } else {
      if (data[schema.key]) sum += 1;
    }
    return sum;
  }

  /**
   * Check "checkMasks". Should return empty string if valid.
   * @param {any} propertyData Property data.
   * @param {object} propertySchema Property schema.
   * @returns {string} Error text.
   */
  static checkMasks(propertyData, propertySchema) {
    try {
      const mask = propertySchema.mask;
      if (!mask || !propertyData) return '';

      const regex = propertySchema.formatChars ? propertySchema.formatChars : {
        9: '[0-9]',
        a: '[A-Za-z]',
        '*': '.*'
      };

      const value = propertyData + '';

      const everyValeCharMatchMask = [...value].every((v, i) => (new RegExp(((val) => (regex)[val] || `${val}`)(mask[i]))).test(v));

      return everyValeCharMatchMask ? '' : MASK_VALUE_ERROR;

    } catch (error) {
      log.save('check-masks-validation-error', {error: error && error.message}, 'warn');
      return '';
    }
  }

  /**
   * Check "options".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @returns {string} Error text.
   */
  static async options(propertyData, propertySchema) {
    // Define keyword.
    if (
      typeof propertySchema[KEYWORD_CONTROL] !== 'undefined' ||
      propertySchema['type'] !== 'string' ||
      !Array.isArray(propertySchema['options'])
    ) {
      return '';
    }

    if (!propertySchema.options.some(v => v.id === propertyData)) {
      return 'Invalid option value.';
    }

    return '';
  }

  /**
   * Check "form.group options".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @returns {string} Error text.
   */
  static async formGroupOptions(propertyData, propertySchema) {
    // Define keyword.
    let error = '';
    if (propertySchema[KEYWORD_CONTROL] !== 'form.group') {
      return error;
    }

    for (const property of Object.keys(propertySchema.properties)) {
      error += await Keywords.options(propertyData[property], propertySchema.properties[property]);
    }

    return error;
  }

  /**
   * Check "register | register.form".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @param {object} externalFunctions External function.
   * @returns {string} Error text.
   */
  static async register(
    propertyData,
    propertySchema,
    pageObject,
    documentDataObject,
    externalFunctions
  ) {
    // Define keyword.
    let error = 'Invalid register value.';
    if (
      typeof propertyData === 'undefined' ||
      typeof propertySchema['keyId'] === 'undefined' ||
      (propertySchema[KEYWORD_CONTROL] !== 'register' &&
        propertySchema[KEYWORD_CONTROL] !== 'register.form')
    ) {
      return '';
    }

    let dataClone = Array.isArray(propertyData)
      ? _.cloneDeep(propertyData)
      : [_.cloneDeep(propertyData)];

    dataClone = JSONPath('$..[?(@.keyId && @.registerId && @.id)]', dataClone);

    dataClone = dataClone[0];
    if (!dataClone) {
      return error;
    }

    const keyId = propertySchema.keyId;
    if (parseInt(keyId) !== parseInt(dataClone.keyId)) {
      return error;
    }

    const recordsFromRegisterService = await externalFunctions.getFilteredRecordsByKeyId(
      dataClone.keyId,
      externalFunctions.getFilteredRecordsByKeyIdArguments.userUnitIds,
      { id: dataClone.id },
      true,
      []
    );

    const recordFromRegisterService = _.get(recordsFromRegisterService, 'data[0]');
    if (!recordFromRegisterService) {
      return error;
    }

    delete dataClone.label;
    delete dataClone.value;

    if (!_.isEqual(_.pickBy(recordFromRegisterService, _.identity), dataClone)) {
      return error;
    }

    return '';
  }

  /**
   * Check "tree.select".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @param {object} externalFunctions External function.
   * @returns {string} Error text.
   */
  static async treeSelect(
    propertyData,
    propertySchema,
    _pageObject,
    _documentDataObject,
    _externalFunctions
  ) {
    // Define keyword.
    let error = 'Invalid tree select value.';
    if (typeof propertyData === 'undefined' || propertySchema[KEYWORD_CONTROL] !== 'tree.select') {
      return '';
    }

    if (Array.isArray(propertySchema.options)) {
      for (const option of propertySchema.options) {
        if (Array.isArray(option.items)) {
          if (option.items.some(v => v.id === propertyData.id && v.name === propertyData.name)) {
            return '';
          }
        }
      }
    }

    return error;
  }

  /**
   * Check "related.selects".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @param {object} externalFunctions External function.
   * @returns {string} Error text.
   */
  static async relatedSelects(
    propertyData,
    propertySchema,
    _pageObject,
    _documentDataObject,
    _externalFunctions
  ) {
    // Define keyword.
    let error = 'Invalid register value.';
    if (
      typeof propertyData === 'undefined' ||
      propertySchema[KEYWORD_CONTROL] !== 'related.selects'
    ) {
      return '';
    }

    return error;
  }

  /**
   * Check "unit.select".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @param {object} externalFunctions External function.
   * @returns {string} Error text.
   */
  static async units(
    propertyData,
    propertySchema,
    _pageObject,
    _documentDataObject,
    _externalFunctions
  ) {
    // Define keyword.
    let error = 'Invalid unit value.';
    if (typeof propertyData === 'undefined' || propertySchema[KEYWORD_CONTROL] !== 'unit.select') {
      return '';
    }

    const units = await models.unit.getAll();
    if (units.length === 0) {
      return error;
    }

    if (propertySchema.multiply) {
      for (const unit of propertyData) {
        if (!units.some(v => v.id === unit.value && v.name === unit.label)) {
          return error;
        }
      }
    } else {
      if (!units.some(v => v.id === propertyData.value && v.name === propertyData.label)) {
        return error;
      }
    }

    return '';
  }

  /**
   * Check "verifiedUserInfo".
   * @param {any} propertyData Property data.
   * @param {object} propertySchema.
   * @param {object} pageObject Page object.
   * @param {object} documentDataObject Document data object.
   * @param {object} externalFunctions External function.
   * @returns {string} Error text.
   */
  static async checkVerifiedUserInfo(
    propertyData,
    propertySchema,
    _pageObject,
    documentDataObject,
    _externalFunctions
  ) {
    if (propertySchema[KEYWORD_CONTROL] !== 'verifiedUserInfo') {
      return '';
    }

    if (propertySchema?.hiddenIsValid) {
      return '';
    }

    let requiredFields;
    if (propertySchema?.calculateFields) {
      try {
        requiredFields = Keywords.sandbox.evalWithArgs(propertySchema?.calculateFields, [documentDataObject]);
      } catch (error) {
        throw new Error(`Keywords.checkVerifiedUserInfo. evaluate calculateFields function error. ${error?.toString()}`);
      }
    } else {
      requiredFields = propertySchema?.fields || [];
    }

    const unfilledFields = requiredFields.filter((field) => {
      const fieldData = propertyData[field];

      if (['email', 'phone', 'unzr', 'gender'].includes(field) && propertyData?.verified[field] && !fieldData?.value) {
        return true;
      }

      if (['email', 'phone', 'unzr', 'gender'].includes(field) && !propertyData?.verified[field] && !fieldData) {
        return false;
      }

      return !fieldData || typeof fieldData !== 'object' || Array.isArray(fieldData.value);
    });

    if (unfilledFields.length > 0) {
      const unfilledFieldNames = unfilledFields.join(', ');
      return `Required fields are not filled: ${unfilledFieldNames}`;
    }

    return '';
  }
}

module.exports = Keywords;
