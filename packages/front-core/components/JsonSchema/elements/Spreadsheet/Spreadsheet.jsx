import React from 'react';
import { translate } from 'react-translate';

import DataSheet from 'components/DataSheet';
import { validateDataAsync } from 'components/JsonSchema';

import SheetLayout from 'components/JsonSchema/elements/Spreadsheet/SheetLayout';
import SheetCell from 'components/JsonSchema/elements/Spreadsheet/SheetCell';
import SheetRow from 'components/JsonSchema/elements/Spreadsheet/SheetRow';
import parsePaste from 'components/JsonSchema/elements/Spreadsheet/parsePaste';
import DataEditor from './DataEditor';

import { input, output } from './dataMapping';
import valueRenderer from './valueRenderer';
import SpreadsheetMenu from './SpreadsheetMenu';

const Spreadsheet = ({
  t,
  undo,
  redo,
  name,
  items,
  headers,
  height,
  data,
  value,
  onChange,
  readOnly,
  jumpTo,
  setJumpTo,
  useCellChangeHandler,
  checkValidOnBlur,
  ...rest
}) => {
  const headerRef = React.useRef();
  const scrollRef = React.useRef();
  const dataListRef = React.useRef();
  const [internalErrors, setInternalErrors] = React.useState();

  const errors = React.useCallback(
    [].concat(rest.errors, internalErrors).filter(Boolean),
    [rest.errors, internalErrors],
  );

  const onRowBlur = React.useCallback(
    async (start, end, setFocusToSelected) => {
      const slicedData = Array(value?.length).fill({});

      slicedData.splice(
        start,
        end - start + 1,
        ...(value || []).slice(start, end + 1),
      );

      const errors = await validateDataAsync(slicedData, rest.schema);

      setInternalErrors(
        errors
          .filter(({ path }) => {
            const rowIndex = parseInt(path.split('.')[0], 10);
            return rowIndex >= start && rowIndex <= end;
          })
          .map((row) => ({
            ...row,
            path: [].concat(rest.path, row.path.split('.')).join('.'),
          })),
      );

      setTimeout(setFocusToSelected, 10);
    },
    [rest.path, rest.schema, value],
  );

  const [menuPosition, setMenuPosition] = React.useState(null);

  const onCellsChanged = (changes, additions) =>
    !readOnly &&
    output(onChange, value, items, useCellChangeHandler)(changes, additions);

  const onContextMenu = (e, cell, i, j) => {
    if (readOnly) {
      return;
    }
    e.preventDefault();
    setMenuPosition({
      cell,
      row: data[i],
      i,
      j,
      mouseX: e.clientX - 2,
      mouseY: e.clientY - 4,
    });
  };

  const dataEditor = (props) => (
    <>
      {valueRenderer(props)}
      <DataEditor
        {...rest}
        {...props}
        errors={errors}
        readOnly={readOnly}
        items={items}
        name={name}
      />
    </>
  );

  const rowRenderer = (props) => <SheetRow {...rest} {...props} />;

  const cellRenderer = (props) => (
    <SheetCell
      {...rest}
      {...props}
      t={t}
      errors={errors}
      readOnly={readOnly}
      items={items}
      name={name}
      dataListRef={dataListRef}
    />
  );

  const sheetRenderer = (props) => (
    <SheetLayout
      {...rest}
      {...props}
      readOnly={readOnly}
      items={items}
      name={name}
      headers={headers}
      headerRef={headerRef}
      scrollRef={scrollRef}
      dataListRef={dataListRef}
    />
  );

  return (
    <>
      <DataSheet
        undo={undo}
        redo={redo}
        overflow="clip"
        height={height}
        jumpTo={jumpTo}
        setJumpTo={setJumpTo}
        errors={errors}
        readOnly={readOnly}
        headerRef={headerRef}
        scrollRef={scrollRef}
        parsePaste={parsePaste(items)}
        dataListRef={dataListRef}
        onRowBlur={checkValidOnBlur && onRowBlur}
        dataEditor={dataEditor}
        rowRenderer={rowRenderer}
        cellRenderer={cellRenderer}
        valueRenderer={valueRenderer}
        sheetRenderer={sheetRenderer}
        data={[].concat(data, input([{}], items))}
        onContextMenu={onContextMenu}
        onCellsChanged={onCellsChanged}
      />
      {readOnly ? null : (
        <SpreadsheetMenu
          data={data}
          value={value}
          onChange={onChange}
          menuPosition={menuPosition}
          onCellsChanged={onCellsChanged}
          setMenuPosition={setMenuPosition}
        />
      )}
    </>
  );
};

export default translate('Elements')(Spreadsheet);
