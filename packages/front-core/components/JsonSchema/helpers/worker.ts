/* eslint-disable no-restricted-globals */
/* eslint-disable no-unused-vars */
/* eslint-disable no-eval */

import Ajv from 'ajv';
import evaluate from 'helpers/evaluate';
import EvaluateError from 'helpers/evaluate/EvaluateError';
import getProcessedFromPayment from 'helpers/getProcessedFromPayment';

import normalizeErrors from './normalizeErrors';
import propertiesEach from './propertiesEach';
import objectPath from 'object-path';
import moment from 'moment';
import { JsonSchemaNode } from '../types';

interface WorkerCommand {
  commandId: string;
  pageDataOrigin: Record<string, unknown>;
  schema: JsonSchemaNode;
  documentData: Record<string, unknown>;
}

interface WorkerScope {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: WorkerCommand }) => void, useCapture?: boolean): void;
}

const workerSelf = self as unknown as WorkerScope;

const removeEmptyFields = (obj: Record<string, unknown>): Record<string, unknown> => {
  if (!obj) return {};
  Object.keys(obj).forEach((key) => obj[key] == null && delete obj[key]);
  return obj;
};

const onMessage = async function ({
  data: { commandId, pageDataOrigin, schema = {}, documentData },
}: {
  data: WorkerCommand;
}): Promise<void> {
  const ajv = new Ajv({ ownProperties: true, allErrors: true });

  const pageData = removeEmptyFields(pageDataOrigin);

  ajv.addKeyword('contactConfirmation', {
    validate: (keywordSchema: unknown, data: Record<string, unknown> = {}) => !keywordSchema || !!data.confirmed,
    errors: false,
  });

  ajv.addKeyword('allVisibleRequired', {
    validate: (keywordSchema: unknown, data: Record<string, unknown> = {}) => {
      if (!keywordSchema) {
        return true;
      }
      const { propertiesHasOptions } = data as { propertiesHasOptions?: Record<string, boolean> };

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
        (property) => !([] as unknown[]).concat((data as Record<string, unknown>)[property]).filter(Boolean).length,
      );
      return !nonDataProperties.length;
    },
    errors: false,
  });

  const validator = ajv.compile(schema as object);

  validator(pageData || {});

  const checkFunctionErrors: Record<string, unknown>[] = [];

  propertiesEach(
    schema,
    pageData,
    (
      propertySchema,
      propertyDataValue,
      propertyPath,
      parentSchema,
      parentDataValue,
      propertyKey,
      popupValue,
    ) => {
      const propertyData = propertyDataValue as Record<string, unknown> & { toLowerCase?: () => string; replace?: (a: RegExp, b: string) => string };
      const parentData = parentDataValue as Record<string, unknown>;
      const checkFunction = (func: string): unknown => {
        let result: unknown;

        if (propertySchema.control === 'address') return;

        if (propertySchema.control === 'payment' && propertyData) {
          const virtualizedValue = {
            ...(propertyData || {}),
            isSuccess: getProcessedFromPayment({ ...(propertyData || {}) } as { processed?: Array<{ status?: { isSuccess?: number } } | null | undefined> }),
          };

          result = evaluate(
            func,
            virtualizedValue,
            pageData,
            documentData,
            parentData,
          );
        }

        if (
          parentSchema.control === 'form.group' ||
          parentSchema.useOwnDataArray
        ) {
          let newPath = propertyPath.split('.').filter(Boolean);
          const numberOfElementsToRemove = 2;
          const newPathString =
            newPath.length > numberOfElementsToRemove
              ? newPath
                  .slice(0, newPath.length - numberOfElementsToRemove)
                  .join('.')
                  .replace(/\[(\d+)\]/g, '.$1')
              : '';
          const parentValue = objectPath.get(pageData, newPathString);
          result = evaluate(
            func,
            propertyData,
            pageData,
            documentData,
            popupValue ? popupValue : parentValue,
          );
        } else {
          result = evaluate(
            func,
            propertyData,
            pageData,
            documentData,
            popupValue ? popupValue : parentData,
          );
        }

        if (result instanceof Error) {
          (result as EvaluateError).commit({
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
      if (
        ((propertySchema?.type === 'object' &&
          propertySchema?.control === 'radio.group') ||
          propertySchema?.control === 'checkbox.group') &&
        (propertySchema?.items as JsonSchemaNode[])?.some?.((el) => !!el?.properties)
      ) {
        const propertiesList = (propertySchema?.items as JsonSchemaNode[])
          ?.map((item) => (!!item?.properties ? item : undefined))
          .filter(Boolean) as JsonSchemaNode[];
        propertiesList.forEach((item) => {
          const properties = item?.properties as Record<string, JsonSchemaNode>;
          Object.entries(properties).forEach(([propertyName, property]) => {
            const checkRequired = property?.checkRequired as string;
            const checkValid = property?.checkValid;

            let pathRequired: string, index: number | undefined;
            const id = item?.id;

            if (propertySchema?.control === 'checkbox.group') {
              index = (propertyData as unknown as Array<{ id?: unknown }>)?.findIndex((el) => el?.id === id);
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
                ? (propertyData as { properties?: Record<string, unknown> })?.properties &&
                  (propertyData as { properties?: Record<string, unknown> })?.properties?.[propertyName]
                : propertyData &&
                  (propertyData as unknown as Record<number, { properties?: Record<string, unknown> }>)[index as number] &&
                  (propertyData as unknown as Record<number, { properties?: Record<string, unknown> }>)[index as number]?.properties &&
                  (propertyData as unknown as Record<number, { properties?: Record<string, unknown> }>)[index as number]?.properties?.[propertyName];

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
                checkValid.forEach(({ isValid, errorText }: { isValid: string; errorText: string }) => {
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
                  checkValid as string,
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
        parentSchema && (parentSchema.required || []).includes(propertyKey as string);

      if (
        propertySchema.checkRequired &&
        checkFunction(propertySchema.checkRequired as string) === true
      ) {
        required = true;
        if (
          propertyData === null ||
          propertyData === undefined ||
          (propertyData as unknown) === ''
        ) {
          checkFunctionErrors.push({
            keyword: 'required',
            dataPath: propertyPath,
          });
        }
      }

      if (propertySchema.checkValid && (required || (typeof propertyData === 'number' || propertyData))) {
        if (Array.isArray(propertySchema.checkValid)) {
          propertySchema.checkValid.forEach(({ isValid, errorText }: { isValid: string; errorText: string }) => {
            if (checkFunction(isValid) === false) {
              checkFunctionErrors.push({
                func: isValid,
                propertyData,
                // pageData,
                // documentData,
                keyword: 'checkValid',
                dataPath: propertyPath,
                errorText,
              });
            }
          });
        } else if (checkFunction(propertySchema.checkValid as string) === false) {
          checkFunctionErrors.push({
            func: propertySchema.checkValid,
            propertyData,
            // pageData,
            // documentData,
            keyword: 'checkValid',
            dataPath: propertyPath,
          });
        }
      }

      if (propertySchema.type === 'array' && propertySchema.required) {
        Object.values(propertyData || []).forEach((itemValue, index) => {
          const item = itemValue as Record<string, unknown>;
          (propertySchema.required as string[]).forEach((requiredField) => {
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
        (propertyData as unknown as string).replace(/<\/?[^>]+>/g, '').length >
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
        (propertyData as unknown as string).replace(/<\/?[^>]+>/g, '').length <
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

      if (propertySchema?.control === 'date') {
        if (!propertyData) return;
        const dateIsInvalid =
          !!propertyData && (propertyData as unknown as string)?.toLowerCase?.() === 'invalid date';
        const dateFormat = propertySchema?.dateFormat || 'DD.MM.YYYY';
        const valueDate =
          moment(propertyData as unknown as string, dateFormat).startOf('day').toDate() || '';
        const minDateEval =
          !!propertySchema?.minDate &&
          evaluate(propertySchema?.minDate, moment, pageData, documentData);
        const minDate = minDateEval && (minDateEval as moment.Moment)?.startOf?.('day')?.toDate?.();
        const maxDateEval =
          !!propertySchema?.maxDate &&
          evaluate(propertySchema?.maxDate, moment, pageData, documentData);
        const maxDate = maxDateEval && (maxDateEval as moment.Moment)?.startOf?.('day')?.toDate?.();
        if (
          dateIsInvalid ||
          (!!valueDate && !!minDate && valueDate < minDate) ||
          (!!valueDate && !!maxDate && valueDate > maxDate)
        ) {
          checkFunctionErrors.push({
            keyword: 'checkValid',
            dataPath: propertyPath,
            value: propertyData,
            errorText: ' ',
          });
        }
      }
    },
  );

  workerSelf.postMessage({
    commandId,
    result: normalizeErrors(
      checkFunctionErrors.concat((validator.errors || []) as unknown as Record<string, unknown>[]).filter(Boolean),
    ),
  });
};

workerSelf.addEventListener('message', onMessage, false);
