import Ajv from 'ajv';
import evaluate from 'helpers/evaluate';

import normalizeErrors from './normalizeErrors';
import propertiesEach from './propertiesEach';

const removeEmptyFields = (obj) => {
  if (!obj) return {};
  Object.keys(obj).forEach((key) => obj[key] == null && delete obj[key]);
  return obj;
};

/**
 *
 * @property data
 *
 */
export default (pageDataOrigin = {}, schema, documentData = {}) => {
  const ajv = new Ajv({ ownProperties: true, allErrors: true });

  const pageData = removeEmptyFields(pageDataOrigin);

  ajv.addKeyword('contactConfirmation', {
    validate: (keywordSchema, data = {}) => !keywordSchema || !!data.confirmed,
    errors: false,
  });

  ajv.addKeyword('allVisibleRequired', {
    validate: (keywordSchema, data = {}) => {
      if (!keywordSchema) {
        return true;
      }
      const { propertiesHasOptions } = data;

      if (Object.keys(data).length && !propertiesHasOptions) {
        return true; // auto defined
      }

      if (!propertiesHasOptions) {
        return false;
      }

      const propertyNames = Object.keys(propertiesHasOptions);
      const hasOptionsProperties = propertyNames.filter(
        (property) => propertiesHasOptions[property],
      );
      const nonDataProperties = hasOptionsProperties.filter(
        (property) => ![].concat(data[property]).filter(Boolean).length,
      );
      return !nonDataProperties.length;
    },
    errors: false,
  });

  const validator = ajv.compile(schema);

  validator(pageData || {});

  const checkFunctionErrors = [];

  propertiesEach(
    schema,
    pageData,
    (
      propertySchema,
      propertyData,
      propertyPath,
      parentSchema,
      parentData,
      propertyKey,
      popupValue,
    ) => {
      const checkFunction = (func) => {
        if (!func || typeof func !== 'string') return null;

        const result = evaluate(
          func,
          propertyData,
          pageData,
          documentData,
          popupValue ? popupValue : parentData,
        );

        if (result instanceof Error) {
          result.commit({
            type: 'check function',
            propertySchema,
            propertyData,
            func,
            schema,
          });
          return null;
        }

        return result;
      };

      if (propertySchema.control === 'address') return;

      if (
        ((propertySchema?.type === 'object' &&
          propertySchema?.control === 'radio.group') ||
          propertySchema?.control === 'checkbox.group') &&
        propertySchema?.items?.some((el) => !!el?.properties)
      ) {
        const propertiesList = propertySchema?.items
          ?.map((item) => (!!item?.properties ? item : undefined))
          .filter(Boolean);
        propertiesList.forEach((item) => {
          const properties = item?.properties;
          Object.entries(properties).forEach(([propertyName, property]) => {
            const checkRequired = property?.checkRequired;
            const checkValid = property?.checkValid;

            let pathRequired, index;
            const id = item?.id;

            if (propertySchema?.control === 'checkbox.group') {
              index = propertyData?.findIndex((el) => el?.id === id);
              pathRequired = `${propertyPath}.${index}.properties.${propertyName}`;
            } else {
              pathRequired = `${propertyPath}.properties.${propertyName}`;
            }

            const result = evaluate(
              checkRequired,
              propertyData,
              pageData,
              documentData,
              parentData,
            );

            const value =
              propertySchema?.control === 'radio.group'
                ? propertyData?.properties &&
                  propertyData?.properties[propertyName]
                : propertyData &&
                  propertyData[index] &&
                  propertyData[index]?.properties &&
                  propertyData[index]?.properties[propertyName];

            if (
              result === true &&
              (!value || value === null || value === undefined || value === '')
            ) {
              checkFunctionErrors.push({
                keyword: 'required',
                dataPath: pathRequired,
              });
            }

            if (checkValid && (result === true || value)) {
              if (Array.isArray(checkValid)) {
                checkValid.forEach(({ isValid, errorText }) => {
                  const isValidResult = evaluate(
                    isValid,
                    value,
                    pageData,
                    documentData,
                    parentData,
                  );
                  if (isValidResult === false) {
                    checkFunctionErrors.push({
                      func: isValid,
                      value,
                      keyword: 'checkValid',
                      dataPath: pathRequired,
                      errorText,
                    });
                  }
                });
              } else if (
                evaluate(
                  checkValid,
                  value,
                  pageData,
                  documentData,
                  parentData,
                ) === false
              ) {
                checkFunctionErrors.push({
                  func: checkValid,
                  propertyData,
                  keyword: 'checkValid',
                  dataPath: pathRequired,
                });
              }
            }
          });
        });
      }

      let required =
        parentSchema && (parentSchema.required || []).includes(propertyKey);

      if (
        propertySchema.checkRequired &&
        checkFunction(propertySchema.checkRequired) === true
      ) {
        required = true;
        if (
          propertyData === null ||
          propertyData === undefined ||
          propertyData === ''
        ) {
          checkFunctionErrors.push({
            keyword: 'required',
            dataPath: propertyPath,
          });
        }
      }

      if (propertySchema.checkValid && (required || (typeof propertyData === 'number' || propertyData))) {
        if (Array.isArray(propertySchema.checkValid)) {
          propertySchema.checkValid.forEach(({ isValid, errorText }) => {
            if (checkFunction(isValid) === false) {
              let resultText = evaluate(
                errorText,
                pageData,
                documentData,
                propertyData,
                parentData,
              );
              if (resultText instanceof Error) {
                resultText = errorText;
              }
              checkFunctionErrors.push({
                func: isValid,
                propertyData,
                pageData,
                documentData,
                keyword: 'checkValid',
                dataPath: propertyPath,
                errorText: resultText,
              });
            }
          });
        } else if (checkFunction(propertySchema.checkValid) === false) {
          checkFunctionErrors.push({
            func: propertySchema.checkValid,
            propertyData,
            pageData,
            documentData,
            keyword: 'checkValid',
            dataPath: propertyPath,
          });
        }
      }

      if (propertySchema.type === 'array' && propertySchema.required) {
        Object.values(propertyData || []).forEach((item, index) => {
          propertySchema.required.forEach((requiredField) => {
            if (
              item[requiredField] === undefined ||
              item[requiredField] === null
            ) {
              checkFunctionErrors.push({
                keyword: 'required',
                dataPath: `${propertyPath}[${index}].${requiredField}`,
              });
            }
          });
        });
      }

      if (
        propertySchema.htmlMaxLength &&
        propertyData &&
        propertyData.replace(/<\/?[^>]+>/g, '').length >
          propertySchema.htmlMaxLength
      ) {
        checkFunctionErrors.push({
          keyword: 'htmlMaxLength',
          dataPath: propertyPath,
          params: {
            limit: propertySchema.htmlMaxLength,
          },
        });
      }

      if (
        propertySchema.htmlMinLength &&
        propertyData &&
        propertyData.replace(/<\/?[^>]+>/g, '').length <
          propertySchema.htmlMinLength
      ) {
        checkFunctionErrors.push({
          keyword: 'htmlMinLength',
          dataPath: propertyPath,
          params: {
            limit: propertySchema.htmlMinLength,
          },
        });
      }
    },
  );

  return normalizeErrors(
    checkFunctionErrors.concat(validator.errors).filter(Boolean),
  );
};
