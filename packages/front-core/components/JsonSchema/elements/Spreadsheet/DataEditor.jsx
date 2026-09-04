import React from 'react';

import { Popover } from '@mui/material';
import useStickyState from 'helpers/useStickyState';
import { SchemaForm, ChangeEvent } from 'components/JsonSchema';

const EDITOR_MIN_WIDTH = 240;

const DataEditor = ({
  classes,
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
  cellRef,
  ...rest
}) => {
  const properties = Object.keys(items.properties || {});
  const propName = properties[col];
  const schema = items.properties[propName];
  const { options, type, mask } = schema;

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [editorValue, setEditorValue] = useStickyState(
    cell.value,
    path.concat(row, propName).join('.'),
    1000,
  );
  let jsonValue;

  React.useEffect(() => {
    if (cellRef && cellRef.current) {
      setAnchorEl(cellRef.current);
    }
  }, [cellRef]);

  const width = Math.max(
    cellRef && cellRef.current && cellRef.current.offsetWidth,
    EDITOR_MIN_WIDTH,
  );

  try {
    if (type !== 'string') {
      jsonValue = JSON.parse(editorValue);
    }
  } catch (e) {
    // nothing to do
  }

  return (
    <Popover
      classes={classes}
      open={true}
      anchorEl={anchorEl}
      transitionDuration={0}
      onClose={() => {
        setEditorValue(null);
        onCommit(editorValue);
      }}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
    >
      <SchemaForm
        {...rest}
        {...schema}
        path={path.concat(row, propName)}
        multiline={!mask}
        width={width}
        schema={schema}
        noMargin={true}
        autoFocus={true}
        required={(schema.required || []).includes(propName)}
        name={propName}
        readOnly={readOnly || schema.readOnly}
        value={jsonValue || editorValue}
        parentValue={parentValue && parentValue[name] && parentValue[name][row]}
        useOwnContainer={true}
        usedInTable={true}
        onCommit={onCommit}
        onChange={(newValue) => {
          const dataValue =
            newValue instanceof ChangeEvent ? newValue.data : newValue;
          if (editorValue !== dataValue) {
            setEditorValue(dataValue);
            onChange(dataValue);
            if (options && type === 'string') {
              onCommit(dataValue);
              setEditorValue(null);
            }
          }
        }}
      />
    </Popover>
  );
};

export default DataEditor;
