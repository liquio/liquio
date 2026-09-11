import React from 'react';

import { SchemaForm, ChangeEvent } from 'components/JsonSchema';
import objectPath from 'object-path';
import useStickyState from 'helpers/useStickyState';
import { JsonSchemaNode } from '../../types';

const allowedDescriptionControls = ['card'];

interface DataEditorProps {
  col: number;
  row: number;
  cell: { value?: unknown };
  items: { properties?: Record<string, JsonSchemaNode> };
  path: Array<string | number>;
  name: string;
  readOnly?: boolean;
  parentValue?: Record<string, Record<string, unknown>>;
  onChange: (value: unknown) => void;
  onCommit: (value: unknown) => void;
  taskId?: string | number;
  stepName?: string;
  [key: string]: unknown;
}

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
}: DataEditorProps) => {
  const properties = Object.keys(items.properties || {});
  const propName = properties[col];
  const schema = (items.properties as Record<string, JsonSchemaNode>)[propName] as JsonSchemaNode & { readOnly?: boolean; required?: string[]; control?: string; options?: unknown };

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
  } catch {
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
          description: allowedDescriptionControls.includes(schema.control as string)
            ? schema.description
            : '',
        }}
        required={(schema.required || []).includes(propName)}
        parentValue={parentValue && parentValue[name] && parentValue[name][row]}
        onChange={(...path: unknown[]) => {
          const newValue = path.pop();
          let dataValue =
            newValue instanceof ChangeEvent ? (newValue as InstanceType<typeof ChangeEvent>).data : newValue;

          if (path?.length) {
            const objectValue: Record<string, unknown> = { ...(value as Record<string, unknown>) };
            objectPath.set(objectValue, path as string[], dataValue);
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
