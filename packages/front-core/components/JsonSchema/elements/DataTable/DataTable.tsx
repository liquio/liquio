import React from 'react';

import DataSheetUntyped from 'components/DataSheet';

import SheetLayout from 'components/JsonSchema/elements/DataTable/SheetLayout';
import SheetCell from 'components/JsonSchema/elements/DataTable/SheetCell';
import SheetRow from 'components/JsonSchema/elements/DataTable/SheetRow';
import DataEditor from 'components/JsonSchema/elements/DataTable/DataEditor';
import { input } from 'components/JsonSchema/elements/DataTable/dataMapping';

import parsePaste from 'components/JsonSchema/elements/Spreadsheet/parsePaste';
import valueRenderer from 'components/JsonSchema/elements/DataTable/valueRenderer';

import evaluate from 'helpers/evaluate';
import { JsonSchemaNode } from '../../types';

const DataSheet = DataSheetUntyped as unknown as React.ComponentType<Record<string, unknown>>;

interface DataTableSchema extends JsonSchemaNode {
  headers: Array<Array<{ align?: string } | string>>;
  showRowNumbers?: boolean;
  headAlign?: string;
}

interface DataTableProps {
  name: string;
  items: { properties?: Record<string, JsonSchemaNode> };
  height: number | string;
  headers: Array<Array<{ label?: string } | string>>;
  data: Array<Array<{ value: unknown }>>;
  value: unknown;
  onChange: (event: { value: unknown; row: number; propName: string }) => void;
  onCellsChanged: (changes: unknown[], additions: unknown[]) => void;
  readOnly?: boolean;
  jumpTo?: { rowId?: number; columnName?: string };
  setJumpTo: (jumpTo: { rowId?: number; columnName?: string } | undefined) => void;
  errors?: unknown[];
  path: Array<string | number>;
  schema: DataTableSchema;
  stepName?: string;
  taskId?: string | number;
  actions?: unknown;
  rootDocument?: { data: Record<string, unknown> };
  originDocument?: { data: Record<string, unknown> };
}

const DataTable = ({
  name,
  items,
  height,
  headers,
  data,
  value,
  onChange,
  onCellsChanged,
  readOnly,
  jumpTo,
  setJumpTo,
  errors,
  path,
  schema,
  stepName,
  taskId,
  actions,
  rootDocument,
  originDocument,
}: DataTableProps) => {
  const headerRef = React.useRef<HTMLTableSectionElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const dataListRef = React.useRef<HTMLTableSectionElement>(null);

  const rowRenderer = (props: Record<string, unknown>) => (
    <SheetRow showRowNumbers={schema.showRowNumbers} {...(props as unknown as { row: number })} />
  );

  const cellRenderer = (props: Record<string, unknown>) => (
    <SheetCell
      {...(props as unknown as { row: number; col: number })}
      path={path}
      errors={errors as never}
      headers={schema.headers}
      onChange={onChange}
      parentValue={value as never}
      readOnly={readOnly}
      items={items}
      name={name}
    />
  );

  const dataEditor = (props: Record<string, unknown>) => (
    <DataEditor
      {...(props as unknown as { col: number; row: number; cell: { value?: unknown }; onChange: (value: unknown) => void; onCommit: (value: unknown) => void })}
      path={path}
      taskId={taskId}
      stepName={stepName}
      actions={actions}
      rootDocument={rootDocument as never}
      originDocument={originDocument as never}
      readOnly={readOnly}
      items={items}
      name={name}
    />
  );

  const sheetRenderer = (props: Record<string, unknown>) => (
    <SheetLayout
      {...(props as unknown as { editing: { i?: number; j?: number } })}
      readOnly={readOnly}
      items={items as never}
      name={name as never}
      headers={headers}
      headerRef={headerRef}
      scrollRef={scrollRef}
      dataListRef={dataListRef}
      errors={errors}
      stepName={stepName}
      path={path}
      headAlign={schema.headAlign}
      showRowNumbers={schema.showRowNumbers}
    />
  );

  const valueViewer = React.useMemo(
    () => (props: { value: unknown; col: number; cell: { value: unknown } }) => {
      let { value: cellValue } = props;

      const cellOptions = (schema.headers[schema.headers.length - 1] as unknown[])[props.col] as { toString?: string };
      if (cellOptions?.toString && typeof cellOptions.toString === 'string') {
        cellValue = evaluate(cellOptions.toString, props.cell.value);
      }

      if (!React.isValidElement(cellValue) && typeof cellValue !== 'string') {
        cellValue = JSON.stringify(cellValue);
      }

      return <span className="value-viewer">{cellValue as React.ReactNode}</span>;
    },
    [schema.headers],
  );

  return (
    <DataSheet
      overflow="clip"
      height={height}
      jumpTo={jumpTo}
      errors={errors}
      readOnly={readOnly}
      fixedRowHeight={33}
      setJumpTo={setJumpTo}
      headerRef={headerRef}
      scrollRef={scrollRef}
      dataEditor={dataEditor}
      disablePageClick={true}
      parsePaste={parsePaste(items as { properties: Record<string, JsonSchemaNode> })}
      valueViewer={valueViewer}
      rowRenderer={rowRenderer}
      dataListRef={dataListRef}
      cellRenderer={cellRenderer}
      valueRenderer={valueRenderer}
      sheetRenderer={sheetRenderer}
      onCellsChanged={onCellsChanged}
      data={([] as unknown[]).concat(data, input([{}], items))}
    />
  );
};

export default DataTable;
