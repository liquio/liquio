import { JsonSchemaNode, PropertiesEachCallback } from '../types';

const propertiesEach = (
  schema: JsonSchemaNode,
  data: unknown,
  callback: PropertiesEachCallback,
  path = '',
  parentSchema: JsonSchemaNode = {},
  parentData: unknown = {},
  key: string | number = '',
  popupValue: unknown = null,
): void => {
  callback(schema, data, path, parentSchema, parentData, key, popupValue);

  if (schema.properties) {
    const newPopupValue = schema.control === 'popup' ? data : popupValue;
    if (schema.control === 'address') {
      return;
    }

    Object.keys(schema.properties).forEach((propertyName) => {
      propertiesEach(
        (schema.properties as Record<string, JsonSchemaNode>)[propertyName],
        ((data || {}) as Record<string, unknown>)[propertyName],
        callback,
        path + '.' + propertyName,
        schema,
        data,
        propertyName,
        newPopupValue,
      );
    });
  }

  if (schema.type === 'array') {
    (data ? Object.values(data) : []).forEach((arrayElement, index) => {
      const newPopupValue = arrayElement;
      propertiesEach(
        (schema.items as JsonSchemaNode) || {},
        arrayElement,
        callback,
        `${path}[${index}]`,
        schema,
        data,
        index,
        newPopupValue,
      );
    });
  }
};

export default propertiesEach;
