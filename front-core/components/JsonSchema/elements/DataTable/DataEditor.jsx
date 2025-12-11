import React from 'react';

import { SchemaForm, ChangeEvent } from 'components/JsonSchema';
import objectPath from 'object-path';
import useStickyState from 'helpers/useStickyState';

const allowedDescriptionControls = ['card'];

const DataEditor = ({
  col,
  row,
  cell,
  items,
  path,
  name,
  readOnly,
  parentValue,
  onChange,
  onCommit,
  ...rest
}) => {
  const properties = Object.keys(items.properties || {});
  const propName = properties[col];
  const schema = items.properties[propName];

  const [value, setValue] = useStickyState(
    cell.value,
    [rest.taskId, rest.stepName].concat(path).join(),
    1000,
  );

  React.useEffect(() => {
    if (typeof value === 'object' && !cell.value) {
      return;
    }

    if (value !== cell.value) {
      setValue(cell.value);
    }
  }, [cell.value]);

  let jsonValue;

  try {
    if (schema.type !== 'string' && typeof value === 'string') {
      jsonValue = JSON.parse(value);
    }
  } catch (e) {
    // nothing to do
  }

  return (
    <div style={{ zIndex: 1, width: '100%' }}>
      <SchemaForm
        {...rest}
        {...schema}
        width="100%"
        name={propName}
        noMargin={true}
        multiline={false}
        usedInTable={true}
        onCommit={onCommit}
        useOwnContainer={true}
        className="dataTable-cell"
        value={jsonValue || value}
        path={path.concat(row, propName)}
        readOnly={readOnly || schema.readOnly}
        schema={{
          ...schema,
          description: allowedDescriptionControls.includes(schema.control)
            ? schema.description
            : '',
        }}
        required={(schema.required || []).includes(propName)}
        parentValue={parentValue && parentValue[name] && parentValue[name][row]}
        onChange={(...path) => {
          const newValue = path.pop();
          let dataValue =
            newValue instanceof ChangeEvent ? newValue.data : newValue;

          if (path?.length) {
            let objectValue = { ...value };
            objectPath.set(objectValue, path, dataValue);
            dataValue = objectValue;
          }

          if (value !== dataValue) {
            onChange(dataValue);
            setValue(dataValue);
            if (schema.options && schema.type === 'string') {
              onCommit(dataValue);
              setValue(null);
            }
          }
        }}
      />
    </div>
  );
};

export default DataEditor;
