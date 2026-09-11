import React from 'react';
import { translate, Translate } from 'react-translate';

import DataSheetUntyped from 'components/DataSheet';
import { validateDataAsync } from 'components/JsonSchema';

import SheetLayout from 'components/JsonSchema/elements/Spreadsheet/SheetLayout';
import SheetCell from 'components/JsonSchema/elements/Spreadsheet/SheetCell';
import SheetRow from 'components/JsonSchema/elements/Spreadsheet/SheetRow';
import parsePaste from 'components/JsonSchema/elements/Spreadsheet/parsePaste';
import DataEditor from './DataEditor';

import { input, output } from './dataMapping';
import valueRenderer from './valueRenderer';
import SpreadsheetMenu from './SpreadsheetMenu';
import { JsonSchemaNode } from '../../types';

const DataSheet = DataSheetUntyped as unknown as React.ComponentType<Record<string, unknown>>;

interface ValidationError {
  path: string;
  [key: string]: unknown;
}

interface MenuPosition {
  cell: unknown;
  row: unknown;
  i: number;
  j: number;
  mouseX: number;
  mouseY: number;
}

interface SpreadsheetProps {
  t: Translate;
  undo?: () => void;
  redo?: () => void;
  name: string;
  items: { properties?: Record<string, JsonSchemaNode> };
  headers: Array<Array<{ label?: string } | string>>;
  height: number | string;
  data: Array<Array<{ value: unknown }>>;
  value?: unknown[];
  onChange: (event: unknown) => void;
  readOnly?: boolean;
  jumpTo?: { rowId?: number; columnName?: string };
  setJumpTo: (jumpTo: { rowId?: number; columnName?: string } | undefined) => void;
  useCellChangeHandler?: boolean;
  checkValidOnBlur?: boolean;
  errors?: ValidationError[];
  path: Array<string | number>;
  schema: { showRowNumbers?: boolean };
  [key: string]: unknown;
}

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
}: SpreadsheetProps) => {
  const headerRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const dataListRef = React.useRef(null);
  const [internalErrors, setInternalErrors] = React.useState<ValidationError[]>();

  // The original called `useCallback(arrayValue, deps)` — passing an already-computed
  // array as the "callback" instead of a function. React's useCallback/useMemo share
  // the same underlying memoization (compare deps, cache the value), so this was
  // already behaving exactly like useMemo; rewritten as useMemo since useCallback's
  // TS signature requires an actual function as its first argument.
  const errors = React.useMemo(
    () => ([] as ValidationError[]).concat(rest.errors as ValidationError[], internalErrors as ValidationError[]).filter(Boolean),
    [rest.errors, internalErrors],
  );

  const onRowBlur = React.useCallback(
    async (start: number, end: number, setFocusToSelected: () => void) => {
      const slicedData = Array((value as unknown[])?.length).fill({});

      slicedData.splice(
        start,
        end - start + 1,
        ...((value as unknown[]) || []).slice(start, end + 1),
      );

      const validationErrors = (await validateDataAsync(slicedData as never, rest.schema as never)) as ValidationError[];

      setInternalErrors(
        validationErrors
          .filter(({ path }) => {
            const rowIndex = parseInt(path.split('.')[0], 10);
            return rowIndex >= start && rowIndex <= end;
          })
          .map((row) => ({
            ...row,
            path: ([] as unknown[]).concat(rest.path as unknown[], row.path.split('.')).join('.'),
          })),
      );

      setTimeout(setFocusToSelected, 10);
    },
    [rest.path, rest.schema, value],
  );

  const [menuPosition, setMenuPosition] = React.useState<MenuPosition | null>(null);

  const onCellsChanged = (changes: unknown[], additions: unknown[]) =>
    !readOnly &&
    output(onChange, value, items, useCellChangeHandler)(changes as never, additions as never);

  const onContextMenu = (e: React.MouseEvent, cell: unknown, i: number, j: number) => {
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

  const dataEditor = (props: Record<string, unknown>) => (
    <>
      {valueRenderer(props as { value: unknown })}
      <DataEditor
        {...(rest as unknown as { path: Array<string | number> })}
        {...(props as unknown as { col: number; row: number; cell: { value?: unknown }; onChange: (value: unknown) => void; onCommit: (value: unknown) => void })}
        errors={errors as never}
        readOnly={readOnly}
        items={items}
        name={name}
      />
    </>
  );

  const rowRenderer = (props: Record<string, unknown>) => <SheetRow {...(rest as unknown as { schema: { showRowNumbers?: boolean } })} {...(props as unknown as { row: number })} />;

  const cellRenderer = (props: Record<string, unknown>) => (
    <SheetCell
      {...(rest as unknown as { path: Array<string | number>; schema: { headers?: unknown[] } })}
      {...(props as unknown as { row: number; col: number })}
      t={t as never}
      errors={errors as never}
      readOnly={readOnly}
      items={items}
      name={name}
      dataListRef={dataListRef}
    />
  );

  const sheetRenderer = (props: Record<string, unknown>) => (
    <SheetLayout
      {...(rest as unknown as { path: Array<string | number> })}
      {...(props as unknown as Record<string, unknown>)}
      readOnly={readOnly as never}
      items={items as never}
      name={name as never}
      headers={headers as never}
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
        parsePaste={parsePaste(items as { properties: Record<string, JsonSchemaNode> })}
        dataListRef={dataListRef}
        onRowBlur={checkValidOnBlur && onRowBlur}
        dataEditor={dataEditor}
        rowRenderer={rowRenderer}
        cellRenderer={cellRenderer}
        valueRenderer={valueRenderer}
        sheetRenderer={sheetRenderer}
        data={([] as unknown[]).concat(data, input([{}], items))}
        onContextMenu={onContextMenu}
        onCellsChanged={onCellsChanged}
      />
      {readOnly ? null : (
        <SpreadsheetMenu
          data={data as never}
          value={value as never}
          onChange={onChange as never}
          menuPosition={menuPosition as never}
          onCellsChanged={onCellsChanged as never}
          setMenuPosition={setMenuPosition as never}
        />
      )}
    </>
  );
};

export default translate('Elements')(Spreadsheet);
