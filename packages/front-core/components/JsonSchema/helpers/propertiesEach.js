const propertiesEach = (
  schema,
  data,
  callback,
  path = '',
  parentSchema = {},
  parentData = {},
  key = '',
  popupValue = null,
) => {
  callback(schema, data, path, parentSchema, parentData, key, popupValue);

  if (schema.properties) {
    const newPopupValue = schema.control === 'popup' ? data : popupValue;
    if (schema.control === 'address') {
      return null;
    }

    Object.keys(schema.properties).forEach((propertyName) => {
      propertiesEach(
        schema.properties[propertyName],
        (data || {})[propertyName],
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
        schema.items || {},
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
