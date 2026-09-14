import React from 'react';
import { useDispatch } from 'react-redux';
import _ from 'lodash/fp';
import objectPath from 'object-path';
import { jsonSchemaInjection } from 'actions/documentTemplate';
import processList from 'services/processList';
import { calcTriggers, defaultSchema } from './schemas/separatedRegister';
import {
  calcTriggersMulti,
  defaultSchemaMulti,
} from './schemas/separatedRegisterMulti';

const insertKey = (
  key: string,
  value: unknown,
  obj: Record<string, unknown>,
  pos: unknown,
) => {
  const keys = Object.keys(obj) || [];

  if ((pos as number) >= keys.length) {
    obj[key] = value;
    return obj;
  }

  const mappedObject: Record<string, unknown> = {};

  keys.forEach((el, i) => {
    if (keys[i - 1] === pos) {
      mappedObject[key] = value;
    }

    mappedObject[el] = obj[el];

    if (keys[i] === pos && i === keys.length - 1) {
      mappedObject[key] = value;
    }
  });

  return mappedObject;
};

interface SeparatedRegisterProps {
  template: Record<string, unknown> & {
    jsonSchema: {
      properties: Record<string, { properties: Record<string, unknown> }>;
      calcTriggers?: Array<{ source: string; target: string; calculate: string }>;
    };
  };
  stepName: string;
  schema: Record<string, unknown> & { inject?: Array<{ position: string; control: Record<string, unknown> }> | null };
  withNamedObjects?: boolean;
  allVisibleStreet?: boolean;
  recordsTree?: boolean;
  hidden?: boolean;
  cleanWhenHidden?: boolean;
  rootDocument: { data: Record<string, unknown> };
  actions: { setValues: (data: unknown) => Promise<unknown> };
  path: Array<string | number>;
  name: string;
  multiAddress?: boolean;
  indexHidden?: unknown;
  isPopup?: boolean;
}

const SeparatedRegister = ({
  template,
  stepName,
  schema,
  withNamedObjects,
  allVisibleStreet,
  recordsTree = false,
  hidden = false,
  cleanWhenHidden = false,
  rootDocument = { data: {} },
  actions,
  path = [],
  name,
  multiAddress,
  indexHidden,
  isPopup,
}: SeparatedRegisterProps) => {
  const { inject = null } = schema;
  const dispatch = useDispatch();

  React.useEffect(() => {
    try {
      const isArray = path.some((el) => typeof el === 'number');
      const newPath = path;
      newPath.pop();
      const newStep = ([] as Array<string | number>).concat(stepName, newPath).join('.');
      const schemaEvaluated = multiAddress
        ? defaultSchemaMulti({
            stepName: newStep,
            withNamedObjects,
            allVisibleStreet,
            recordsTree,
            hidden,
            isArray,
            isPopup,
            addressName: name,
            indexHidden,
            hiddenFunction: (schema as { checkHidden?: unknown })?.checkHidden,
            requiredFunction: (schema as { checkRequired?: unknown })?.checkRequired,
          })
        : defaultSchema({
            stepName: newStep,
            withNamedObjects,
            allVisibleStreet,
            recordsTree,
            hidden,
            isArray,
            isPopup,
            indexHidden,
            hiddenFunction: (schema as { checkHidden?: unknown })?.checkHidden,
            requiredFunction: (schema as { checkRequired?: unknown })?.checkRequired,
          });

      const evaluatedCalcTriggers = multiAddress
        ? calcTriggersMulti({
            stepName: newStep,
            hidden,
            isArray,
            addressName: name,
            isPopup,
          })
        : calcTriggers({
            stepName: newStep,
            hidden,
            isArray,
            isPopup,
          });

      const customMerge = (objValue: unknown, _srcValue: unknown, key: string) => {
        if (['cleanWhenHidden', 'hidden'].includes(key)) {
          return objValue;
        }
        return undefined;
      };

      const mergedSchema = _.mergeWith(customMerge, schemaEvaluated, schema) as {
        properties?: Record<string, { properties?: Record<string, unknown> }>;
      };

      if (inject) {
        inject.forEach((element) => {
          const { position, control } = element;
          Object.keys(control).forEach((key) => {
            const group = position.split('.')[0];
            const groupIndex = position.split('.')[1];
            const source = !groupIndex
              ? mergedSchema
              : mergedSchema?.properties?.[group];
            const injectedSchema = insertKey(
              key,
              control[key],
              (source as { properties?: Record<string, unknown> })?.properties as Record<string, unknown>,
              groupIndex || group,
            );
            objectPath.set(source as Record<string, unknown>, 'properties', injectedSchema);
          });
        });
      }

      const stepProperties =
        template.jsonSchema.properties[stepName].properties;

      const findPath = (
        obj: Record<string, unknown>,
        targetName: string,
        path: string[] = [],
      ): string[] | null => {
        if (obj && (obj[targetName] as { control?: string })?.control === 'address') {
          return path;
        }

        for (const key in obj) {
          if (
            Object.prototype.hasOwnProperty.call(obj, key) &&
            typeof obj[key] === 'object'
          ) {
            const result = findPath(obj[key] as Record<string, unknown>, targetName, [...path, key]);
            if (result) {
              return result;
            }
          }
        }
        return null;
      };

      const pathAddress = findPath(stepProperties, name);

      if (pathAddress) {
        let targetObject: Record<string, unknown> = stepProperties;
        for (const key of pathAddress) {
          targetObject = targetObject[key] as Record<string, unknown>;
        }

        const stepObjectWithAddress = Object.entries(targetObject).reduce(
          (acc: Record<string, unknown>, [key, value]) => {
            if ((value as { control?: string })?.control === 'address' && key === name) {
              return {
                ...acc,
                ...mergedSchema?.properties,
                [key]: value,
              };
            }
            return {
              ...acc,
              [key]: value,
            };
          },
          {},
        );

        if (pathAddress.length === 0) {
          template.jsonSchema.properties[stepName].properties =
            stepObjectWithAddress;
        } else {
          objectPath.set(
            stepProperties,
            pathAddress || [],
            stepObjectWithAddress,
          );
        }
      }

      const existingCalcTriggers = template.jsonSchema.calcTriggers || [];

      evaluatedCalcTriggers.forEach((newTrigger) => {
        const existingIndex = existingCalcTriggers.findIndex(
          (existingTrigger) =>
            existingTrigger.source === newTrigger.source &&
            existingTrigger.target === newTrigger.target,
        );

        if (existingIndex !== -1) {
          const existingTrigger = existingCalcTriggers[existingIndex];

          if (existingTrigger.calculate !== newTrigger.calculate) {
            existingCalcTriggers[existingIndex] = newTrigger;
          }
        } else {
          existingCalcTriggers.push(newTrigger);
        }
      });

      template.jsonSchema.calcTriggers = existingCalcTriggers;

      jsonSchemaInjection(template)(dispatch);
    } catch (e) {
      console.log('address init error', e);
    }
  }, [
    dispatch,
    template,
    stepName,
    schema,
    withNamedObjects,
    inject,
    recordsTree,
    hidden,
    name,
  ]);

  React.useEffect(() => {
    if (cleanWhenHidden && hidden) {
      const fieldToDelete = [
        'region',
        'district',
        'city',
        'street',
        'building',
        'isPrivateHouse',
        'apt',
      ];

      const fieldsAreInObject = fieldToDelete.some((field) => {
        return objectPath.has(rootDocument.data, `${stepName}.${field}`);
      });

      if (fieldsAreInObject) {
        const newData = _.cloneDeep(rootDocument);

        fieldToDelete.forEach((field) => {
          objectPath.del(newData.data, `${stepName}.${field}`);
        });

        processList.hasOrSet(path.join('-'), () => {
          actions.setValues(newData.data);
        });
      }
    }
  }, [cleanWhenHidden, hidden, stepName, rootDocument, actions, path]);

  return null;
};

export default SeparatedRegister;
