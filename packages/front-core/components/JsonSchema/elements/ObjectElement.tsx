import React from 'react';

import SchemaForm from '../SchemaForm';

interface ObjectElementProps {
  properties?: Record<string, { readOnly?: boolean; [key: string]: unknown }>;
  schema: { required?: string[]; [key: string]: unknown };
  readOnly?: boolean;
  value?: Record<string, unknown>;
  onChange: (key: string, ...args: unknown[]) => void;
  path: Array<string | number>;
  parentValue?: unknown;
  [key: string]: unknown;
}

const ObjectElement = ({
  properties,
  schema,
  readOnly,
  value,
  onChange,
  path,
  parentValue,
  ...rest
}: ObjectElementProps) =>
  Object.keys(properties || {}).map((key) => (
    <SchemaForm
      {...rest}
      {...properties?.[key]}
      schema={properties?.[key]}
      path={path.concat(key)}
      required={(schema.required || []).includes(key)}
      key={key}
      name={key}
      readOnly={readOnly || properties?.[key]?.readOnly}
      value={(value || {})[key]}
      parentValue={parentValue || value}
      onChange={onChange.bind(null, key)}
    />
  ));

ObjectElement.defaultProps = {
  errors: [],
  value: {},
  path: [],
  onChange: () => null,
};

export default ObjectElement;
