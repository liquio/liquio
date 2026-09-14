import evaluate from 'helpers/evaluate';
import EvaluateError from 'helpers/evaluate/EvaluateError';
import { JsonSchemaNode } from '../types';

const removeHiddenFields = (
  schema: JsonSchemaNode,
  data: unknown,
  { stepData = {}, parentData }: { stepData?: Record<string, unknown>; parentData?: Record<string, unknown> } = {},
): JsonSchemaNode => {
  const { properties: schemaProperties, required: schemaRequired } = schema;

  if (!schemaProperties) {
    return schema;
  }

  const required = (schemaRequired || []).filter((field) => {
    if (schemaProperties[field] && !schemaProperties[field].hidden) {
      return true;
    }

    if (typeof schemaProperties[field]?.hidden === 'boolean') {
      return schemaProperties[field]?.hidden;
    }

    const result = evaluate(schemaProperties[field]?.hidden as string, data);

    if (result instanceof Error) {
      (result as EvaluateError).commit({ type: 'template required error', schema });
    }

    return !result;
  });

  const properties = Object.keys(schemaProperties).reduce(
    (acc, propertyName) => {
      const property = schemaProperties[propertyName];

      if (property.hidden && evaluate(property.hidden as string, data) === true) {
        if (required.includes(propertyName)) {
          required.splice(required.indexOf(propertyName), 1);
        }
        return acc;
      }

      const value = ((parentData || stepData) as Record<string, unknown>)[propertyName];

      if (
        property.checkHidden &&
        evaluate(
          property.checkHidden as string,
          value,
          stepData,
          data,
          parentData || {},
        ) === true
      ) {
        if (required.includes(propertyName)) {
          required.splice(required.indexOf(propertyName), 1);
        }
        return acc;
      }

      // if (property.type === 'array' && property.items) {
      //     property.items = removeHiddenFields(property.items, data, { stepData, parentData: (value || [])[0] });
      // }

      return {
        ...acc,
        [propertyName]:
          property.type === 'object'
            ? removeHiddenFields(property, data, {
                stepData,
                parentData: value as Record<string, unknown>,
              })
            : property,
      };
    },
    {} as Record<string, JsonSchemaNode>,
  );

  return { ...schema, required, properties };
};

export default removeHiddenFields;
