export default ({ value, schema, schema: { allVisibleRequired } = {} }) => {
  let required = schema.required || [];

  if (allVisibleRequired) {
    if (value && value.propertiesHasOptions) {
      required = required.concat(
        Object.keys(value.propertiesHasOptions).filter(
          (option) => value.propertiesHasOptions[option],
        ),
      );
    } else {
      required = required.concat(Object.keys(schema.properties));
    }
  }

  return required;
};
