interface RequiredSchema {
  required?: string[];
  allVisibleRequired?: boolean;
  properties?: Record<string, unknown>;
}

interface RequiredValue {
  propertiesHasOptions?: Record<string, boolean>;
}

export default ({
  value,
  schema,
  schema: { allVisibleRequired } = {},
}: {
  value?: RequiredValue;
  schema: RequiredSchema;
}): string[] => {
  let required = schema.required || [];

  if (allVisibleRequired) {
    if (value && value.propertiesHasOptions) {
      required = required.concat(
        Object.keys(value.propertiesHasOptions).filter(
          (option) => (value.propertiesHasOptions as Record<string, boolean>)[option],
        ),
      );
    } else {
      required = required.concat(Object.keys(schema.properties || {}));
    }
  }

  return required;
};
