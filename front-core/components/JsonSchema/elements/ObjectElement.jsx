import React from 'react';
import PropTypes from 'prop-types';

import SchemaForm from '../SchemaForm';

const ObjectElement = ({
  properties,
  schema,
  readOnly,
  value,
  onChange,
  path,
  parentValue,
  ...rest
}) =>
  Object.keys(properties || {}).map((key) => (
    <SchemaForm
      {...rest}
      {...properties[key]}
      schema={properties[key]}
      path={path.concat(key)}
      required={(schema.required || []).includes(key)}
      key={key}
      name={key}
      readOnly={readOnly || properties[key].readOnly}
      value={(value || {})[key]}
      parentValue={parentValue || value}
      onChange={onChange.bind(null, key)}
    />
  ));

ObjectElement.propTypes = {
  errors: PropTypes.array,
  value: PropTypes.object,
  path: PropTypes.array,
  onChange: PropTypes.func,
};

ObjectElement.defaultProps = {
  errors: [],
  value: {},
  path: [],
  onChange: () => null,
};

export default ObjectElement;
