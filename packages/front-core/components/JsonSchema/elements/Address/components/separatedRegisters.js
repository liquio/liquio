import React from 'react';
import PropTypes from 'prop-types';
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

const insertKey = (key, value, obj, pos) => {
  const keys = Object.keys(obj) || [];

  if (pos >= keys.length) {
    obj[key] = value;
    return obj;
  }

  const mappedObject = {};

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

const SeparatedRegister = ({
  template,
  stepName,
  schema,
  schema: { inject = null },
  withNamedObjects,
  allVisibleStreet,
  recordsTree,
  hidden,
  cleanWhenHidden,
  rootDocument,
  actions,
  path,
  name,
  multiAddress,
  indexHidden,
  isPopup,
}) => {
  const dispatch = useDispatch();

  React.useEffect(() => {
    try {
      const isArray = path.some((el) => typeof el === 'number');
      const newPath = path;
      newPath.pop();
      const newStep = [].concat(stepName, newPath).join('.');
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
            hiddenFunction: schema?.checkHidden,
            requiredFunction: schema?.checkRequired
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
            hiddenFunction: schema?.checkHidden,
            requiredFunction: schema?.checkRequired
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

      const customMerge = (objValue, _, key) => {
        if (['cleanWhenHidden', 'hidden'].includes(key)) {
          return objValue;
        }
      };

      const mergedSchema = _.mergeWith(customMerge, schemaEvaluated, schema);

      if (inject) {
        inject.forEach((element) => {
          const { position, control } = element;
          Object.keys(control).forEach((key) => {
            const group = position.split('.')[0];
            const groupIndex = position.split('.')[1];
            const source = !groupIndex
              ? mergedSchema
              : mergedSchema?.properties[group];
            const injectedSchema = insertKey(
              key,
              control[key],
              source.properties,
              groupIndex || group,
            );
            objectPath.set(source, 'properties', injectedSchema);
          });
        });
      }

      const stepProperties =
        template.jsonSchema.properties[stepName].properties;

      const findPath = (obj, targetName, path = []) => {
        if (obj && obj[targetName] && obj[targetName].control === 'address') {
          return path;
        }

        for (const key in obj) {
          if (
            Object.prototype.hasOwnProperty.call(obj, key) &&
            typeof obj[key] === 'object'
          ) {
            const result = findPath(obj[key], targetName, [...path, key]);
            if (result) {
              return result;
            }
          }
        }
        return null;
      };

      const pathAddress = findPath(stepProperties, name);

      if (pathAddress) {
        let targetObject = stepProperties;
        for (const key of pathAddress) {
          targetObject = targetObject[key];
        }

        const stepObjectWithAddress = Object.entries(targetObject).reduce(
          (acc, [key, value]) => {
            if (value.control === 'address' && key === name) {
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

SeparatedRegister.propTypes = {
  template: PropTypes.object,
  stepName: PropTypes.string,
  schema: PropTypes.object,
  withNamedObjects: PropTypes.bool,
  allVisibleStreet: PropTypes.bool,
  recordsTree: PropTypes.bool,
  hidden: PropTypes.bool,
  cleanWhenHidden: PropTypes.bool,
  rootDocument: PropTypes.object,
  actions: PropTypes.object,
  path: PropTypes.array,
};

SeparatedRegister.defaultProps = {
  template: {},
  stepName: '',
  schema: {},
  withNamedObjects: null,
  allVisibleStreet: false,
  recordsTree: false,
  hidden: false,
  cleanWhenHidden: false,
  rootDocument: {},
  actions: {},
  path: [],
};

export default SeparatedRegister;
