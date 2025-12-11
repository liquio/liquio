
const _ = require('lodash');
const Ajv = require('ajv');
const PropByPath = require('prop-by-path');

const { JSONPath } = require('../../lib/jsonpath');
const DocumentHandler = require('../../lib/document_handler');
const Keywords = require('./keywords');
const ValidatorError = require('./validator_error');
const Paths = require('./paths');
const RegisterService = require('../../services/register');
const Sandbox = require('../../lib/sandbox');

// Constants.
// const CONTROL_PAYMENT_NAME = 'payment';
const INIT_DATA_PROP = 'initData'; // Data for system task.

/**
 * Document validator service.
 @typedef {import('../../entities/document')} DocumentEntity
 */
class DocumentValidatorService {
  /**
   * Schema validator constructor.
   * @param {object} jsonSchema JSON schema.
   * @param {object} externalFunctions External functions.
   */
  constructor(jsonSchema, externalFunctions, userInfo) {
    // Init AJV.
    this.ajv = new Ajv({ logger: false });
    this.jsonSchema = jsonSchema;
    this.userInfo = userInfo;
    this.externalFunctions = externalFunctions;
    this.validation = this.ajv.compile(this.jsonSchema);
    this.registerService = new RegisterService();
    this.sandbox = new Sandbox();
  }

  /**
   * Check.
   * @param {object} objectToCheck Object to check.
   * @param {boolean} includesUnexpectedErrors Includes unexpected errors.
   * @returns {Promise<ValidatorError[]>} Validator errors list promise.
   */
  async check(objectToCheck, includesUnexpectedErrors) {
    // Check is valid.
    this.validation(objectToCheck);

    // Check custom keywords.
    const keywordsErrors = await this.checkKeywords(objectToCheck);

    // Check standard AJV errors.
    const ajvErrors = this.validation.errors || [];

    // Check unexpected errors.
    const unexpectedErrors = includesUnexpectedErrors ? this.checkUnexpectedErrors(objectToCheck) : [];

    // Return all errors array.
    const errors = [...ajvErrors.map(v => new ValidatorError(v)), ...keywordsErrors, ...unexpectedErrors];

    // Remove validation of hidden fields.
    const errorsWithoutHiddenFields = errors
      .filter(v => !this.isHiddenField(v, objectToCheck))
      // eslint-disable-next-line no-unused-vars
      .map(({ isFinalPath, ...error }) => error);

    // Return errors without hidden fields.
    return errorsWithoutHiddenFields;
  }

  /**
   * Is hidden field.
   * @param {ValidatorError} error Error.
   * @returns {boolean} Is hidden field indicator.
   */
  isHiddenField(error, objectToCheck) {
    // Define params.
    const { dataPath, validationParam, isFinalPath } = error;

    // Check needed values not defined.
    if (!dataPath || !validationParam) {
      return false;
    }

    // Define value schema.
    let valuePath;

    // Check that validationParam is not regexp.
    if (/\^|\$|\[|]|{|}|-/.test(validationParam) || isFinalPath) {
      valuePath = dataPath;
    } else {
      valuePath = `${dataPath}.${validationParam}`;
    }

    // Check properties hidden.
    const pathItems = valuePath.split('.');

    for (let p = 0; p < pathItems.length; p++) {
      const propertyValuePath = p ? valuePath.split('.').slice(0, -p).join('.') : valuePath;

      const propertySchemaPathTemplate = `$..${propertyValuePath.replace(/\[\w+\]/g, '.').replace(/\.\./g, '.').replace(/\.$/g, '').replace(/\./g, '..')}`;
      const [propertyValueSchema] = JSONPath({ path: propertySchemaPathTemplate, json: this.jsonSchema });

      if (typeof propertyValueSchema === 'object' && propertyValueSchema !== null && this.checkHidden({
        objectToCheck,
        valuePath: propertyValuePath,
        hidden: propertyValueSchema.hidden
      })) {
        return true;
      }
    }

    // Return `false` in other cases.
    return false;
  }

  checkHidden({ objectToCheck, valuePath, hidden }) {
    if (!hidden) {
      return false;
    }

    if (typeof hidden === 'boolean') {
      return hidden;
    }

    if (typeof hidden === 'string') {
      const pathItems = valuePath.split('.');
      const parentPath = pathItems.slice(0, pathItems.length - 1).join('.');
      const value = PropByPath.get(objectToCheck, valuePath);
      const parentValue = PropByPath.get(objectToCheck, parentPath);
      return this.sandbox.evalWithArgs(
        hidden,
        [objectToCheck, value, parentValue, this.userInfo],
        { meta: { fn: 'DocumentValidatorService.checkHidden', valuePath } },
      );
    }

    return false;
  }

  /**
   * Check keywords.
   * @private
   * @param {object} objectToCheck Object to check.
   * @returns {{dataPath, validationParam, message}[]}
   */
  async checkKeywords(objectToCheck) {
    // Errors container.
    let errors = [];

    // Check properties.
    const checkProperty = async (path, currentElementValue, objectToCheck, currentElementDescription, errors) => {
      // Check keywords.
      try {
        const [page] = path.split('.');
        const currentPageValue = PropByPath.get(objectToCheck, page);
        const currentElementKeywordErrors = await Keywords.check(
          currentElementValue,
          currentElementDescription,
          currentPageValue,
          objectToCheck,
          this.externalFunctions
        );
        const currentElementKeywordFormattedErrors = currentElementKeywordErrors.map(
          message => ({
            dataPath: path,
            control: currentElementDescription?.control,
            validationParam: currentElementValue,
            isFinalPath: true,
            message
          })
        );
        errors.push(...currentElementKeywordFormattedErrors);
      } catch (error) {
        log.save('json-schema-validation-exception', error.message, 'warn');
      }
    };

    // Handle all child properties.
    const childProperties = DocumentHandler.getSchemaChildProperties(this.jsonSchema);
    for (const childProperty of childProperties) {
      // Define current element value.
      const currentElementValue = PropByPath.get(objectToCheck, childProperty.path);
      await checkProperty(childProperty.path, currentElementValue, objectToCheck, childProperty.schemaObject, errors);
    }

    // Return collected errors.
    return errors;
  }

  /**
   * Remove readonly params if need.
   * @param {{path, value}[]} properties Properties to check and remove readonly params.
   * @param {DocumentEntity.data} documentDataObject
   * @param {boolean} isFromSystemTask.
   * @returns {{path, value}[]} Properties without readonly params.
   */
  async removeReadonlyParams(properties, documentDataObject, isFromSystemTask) {
    // Append JSON schema paths.
    const propertiesWithJsonSchemaPaths = properties.map(property => ({
      path: property.path,
      value: property.value,
      jsonSchemaPath: Paths.getJsonSchemaPath(property.path)
    }));

    // Return with removed readonly params.
    let propertiesWithoutReadonlyParams = propertiesWithJsonSchemaPaths
      // Filter changed to save every property that can be automatically defined.
      .filter(property => !this.isCurrentOrParentControlsReadonly(this.jsonSchema, property.jsonSchemaPath))
      .filter(property => !this.isCurrentOrParentControlsCheckReadonlyTrue(this.jsonSchema, property, documentDataObject))
      .filter(property => {
        const jsonSchemaParts = property.jsonSchemaPath.split('.'); // ['properties', 'payment', 'verifiedUserInfo', 'externalReaderCheck', 'properties', 'calculated', 'properties', 'price']
        let currentJsonSchemaPath = '';
        for (const jsonSchemaPartsItem of jsonSchemaParts) {
          // Prepare current JSON schema.
          currentJsonSchemaPath += `.${jsonSchemaPartsItem}`;
          const currentJsonSchemaItem = PropByPath.get(this.jsonSchema, currentJsonSchemaPath);
          const currentControl = PropByPath.get(this.jsonSchema, `${currentJsonSchemaPath}.control`);

          // Check if it is payment control.
          if (
            currentControl === 'payment' ||
            typeof currentControl === 'string' && currentControl.startsWith('payment.')
          ) {
            return false;
          }

          // Check if it is verifiedUserInfo control.
          if (currentControl === 'verifiedUserInfo') {
            const parentPropertyPath = property.path.slice(
              0,
              property.path.indexOf(jsonSchemaPartsItem) + jsonSchemaPartsItem.length
            );

            // Check if it is parent property path.
            if (parentPropertyPath === property.path) {
              return false;
            }

            const fields = PropByPath.get(this.jsonSchema, `${currentJsonSchemaPath}.fields`);
            const data = PropByPath.get(documentDataObject, parentPropertyPath);

            const [currentField] =
              property.path.slice(parentPropertyPath.length + 1).split('.') || [];
            if (Array.isArray(fields)) {
              if (currentField === 'verified') {
                return false;
              }

              if (currentField && fields.includes(currentField) && data?.verified?.[currentField]) {
                return false;
              }
            }
          }

          // Check if it is externalReaderCheck control.
          if (currentControl === 'externalReaderCheck') {
            return false;
          }

          // Check if External Reader value.
          if (
            typeof currentJsonSchemaItem?.value === 'string' &&
            currentJsonSchemaItem.value.startsWith('external-reader.')
          ) {
            return false;
          }
        }

        // Check all included properties of value to set if it is payment control.
        if (typeof property.value === 'object' && property.value !== null) {
          for (const valueToSetKey in property.value) {
            if (PropByPath.get(this.jsonSchema, `${currentJsonSchemaPath}.properties.${valueToSetKey}.control`) === 'payment') {
              return false;
            }
            if (PropByPath.get(this.jsonSchema, `${currentJsonSchemaPath}.properties.${valueToSetKey}.control`) === 'verifiedUserInfo') {
              return false;
            }
            if (PropByPath.get(this.jsonSchema, `${currentJsonSchemaPath}.properties.${valueToSetKey}.control`) === 'externalReaderCheck') {
              return false;
            }
          }
        }

        if (!isFromSystemTask && property.path.includes(INIT_DATA_PROP)) {
          return false;
        }

        return true;
      });

    // Match properties with inner already defined readonly params.
    let matchedPropertiesWithoutReadonlyParams = propertiesWithoutReadonlyParams.map(v => {
      // If without inner fields, except Arrays.
      if (typeof v.value !== 'object' || v.value === null || Array.isArray(v.value)) return v;

      // If with inner fields.
      let mergedValue = {};
      for (const innerKey in v.value) {
        // Check if inner field readonly.
        const innerJsonSchemaPath = `${v.jsonSchemaPath}.properties.${innerKey}`;
        const propertiesWithJsonSchemaPaths = {
          path: `${v.path}.${innerKey}`,
          value: PropByPath.get(documentDataObject, `${v.path}.${innerKey}`),
          jsonSchemaPath: innerJsonSchemaPath
        };
        const isInnerReadonly = this.isCurrentOrParentControlsReadonly(this.jsonSchema, innerJsonSchemaPath) || 
        this.isCurrentOrParentControlsCheckReadonlyTrue(this.jsonSchema, propertiesWithJsonSchemaPaths, documentDataObject);
        if (isInnerReadonly) {
          const innerPath = `${v.path}.${innerKey}`;
          const innerPreviousValue = PropByPath.get(documentDataObject, innerPath);
          mergedValue[innerKey] = innerPreviousValue;
          continue;
        }

        // Save as is in other cases.
        mergedValue[innerKey] = v.value[innerKey];
      }
      return { ...v, value: mergedValue };
    });

    // Normalize properties and return.
    let normalizedProperties = matchedPropertiesWithoutReadonlyParams
      .map(property => ({ path: property.path, value: property.value }));
    return normalizedProperties;
  }

  /**
   * Check previous values.
   * @param {{path, value, previousValue}[]} properties Properties to check and remove readonly params.
   * @param {object} documentData Document data.
   * @returns {{incorrectValues: {path, value, previousValue, realPreviousValue}[]}} Previous values differentiation.
   */
  checkPreviousValues(properties, documentData) {
    const propertiesWithRealPreviousValues = properties.map(property => ({
      ...property,
      realPreviousValue: PropByPath.get(documentData, property.path)
    }));
    const incorrectValues = propertiesWithRealPreviousValues
      .filter(property => typeof property.previousValue !== 'undefined')
      .filter(property => typeof property.realPreviousValue !== 'undefined')
      .filter(property => `${property.previousValue}` !== `${property.realPreviousValue}`);
    return { incorrectValues };
  }

  /**
   * Check unexpected errors.
   * @param {object} objectToCheck Object to check.
   */
  checkUnexpectedErrors(objectToCheck) {
    // Errors container.
    let errors = [];

    // Check attachments placeholders.
    const attachmentsPlaceholdersArray = JSONPath('$..[?(@.isAttachmentPlaceholder === true)]', objectToCheck);
    if (attachmentsPlaceholdersArray.length > 0) {
      const message = 'Document contains unexpectedly stopped attachment loading process.';
      const validationParam = null;
      const attachmentsPlaceholdersErrors = attachmentsPlaceholdersArray.map(v => ({
        dataPath: v.data && v.data.dataPath,
        validationParam,
        message,
        isUnexpected: true
      }));
      errors = [...errors, ...attachmentsPlaceholdersErrors];
    }

    // Return errors.
    return errors;
  }

  /**
   * Is current or parent controls readonly.
   * @param {object} jsonSchema JSON schema.
   * @param {string} path Control path.
   * @returns {boolean} Is current or parent controls readonly indicator.
   */
  isCurrentOrParentControlsReadonly(jsonSchema, path) {
    // Define controls list.
    const controls = this.getCurrentAndParentControls(jsonSchema, path);

    // Check some control is readonly.
    return controls.some(v => v && (v.readonly === true || v.readOnly === true));
  }

  /**
   * Get current and parent controls.
   * @param {object} jsonSchema JSON schema.
   * @param {string} path Control path.
   * @returns {any[]} Current and parent controls array.
   */
  getCurrentAndParentControls(jsonSchema, path) {
    // Controls container.
    const controls = [];

    // Define controls.
    const pathItems = path.split('.');
    for (let i = 1; i <= pathItems.length; i++) {
      const pathItemsSlice = pathItems.slice(0, i);
      const pathSlice = pathItemsSlice.join('.');
      const control = _.get(jsonSchema, pathSlice);

      // // Handle current item child element, if it is Object.
      // if (control instanceof Object) {
      //   Object.keys(control).forEach(v => controls.push(control[v]));
      // }

      controls.push(control);
    }

    // Return defined controls.
    return controls;
  }

  /**
   * Is current or parent controls readonly.
   * @param {object} jsonSchema JSON schema.
   * @param {object} property Property.
   * @param {object} documentDataObject Document data object.
   * @returns {boolean} Is current or parent controls have checkReadonly option and it returns true.
   */
  isCurrentOrParentControlsCheckReadonlyTrue(jsonSchema, property, documentDataObject) {
    const controlSchema = PropByPath.get(jsonSchema, property.jsonSchemaPath);
    if (controlSchema?.checkReadonly) {
      const propertyData = property.value;
      const [stepName] = property.path.split('.');
      const currentPageValue = PropByPath.get(documentDataObject, stepName);
      return this.sandbox.evalWithArgs(
        controlSchema.checkReadonly,
        [propertyData, currentPageValue, documentDataObject],
        { meta: { fn: 'DocumentValidatorService.isCurrentOrParentControlsCheckReadonlyTrue', property } },
      );
    }; 
    
    const jsonSchemaParts = property.jsonSchemaPath.split('.');
    let currentJsonSchemaPath = '';

    for (const jsonSchemaPartsItem of jsonSchemaParts) {
      currentJsonSchemaPath += `.${jsonSchemaPartsItem}`;
      const currentJsonSchemaItem = PropByPath.get(jsonSchema, currentJsonSchemaPath);
      if (!currentJsonSchemaItem?.checkReadonly) continue;
      const currentDoumentPath = currentJsonSchemaPath.split('.').filter(e => e !== 'properties').join('.');
      const propertyData = PropByPath.get(documentDataObject, currentDoumentPath);
      const [, stepName] = currentDoumentPath.split('.');
      const currentPageValue = PropByPath.get(documentDataObject, stepName);
      return this.sandbox.evalWithArgs(
        currentJsonSchemaItem.checkReadonly,
        [propertyData, currentPageValue, documentDataObject],
        { meta: { fn: 'DocumentValidatorService.isCurrentOrParentControlsCheckReadonlyTrue', property } },
      );
    }
  }
}

module.exports = DocumentValidatorService;
