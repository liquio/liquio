import React from 'react';

import DataSheet from 'components/DataSheet';

import SheetLayout from 'components/JsonSchema/elements/DataTable/SheetLayout';
import SheetCell from 'components/JsonSchema/elements/DataTable/SheetCell';
import SheetRow from 'components/JsonSchema/elements/DataTable/SheetRow';
import DataEditor from 'components/JsonSchema/elements/DataTable/DataEditor';
import { input } from 'components/JsonSchema/elements/DataTable/dataMapping';

import parsePaste from 'components/JsonSchema/elements/Spreadsheet/parsePaste';
import valueRenderer from 'components/JsonSchema/elements/DataTable/valueRenderer';

import evaluate from 'helpers/evaluate';

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
}) => {
  const headerRef = React.useRef();
  const scrollRef = React.useRef();
  const dataListRef = React.useRef();

  const rowRenderer = (props) => (
    <SheetRow showRowNumbers={schema.showRowNumbers} {...props} />
  );

  const cellRenderer = (props) => (
    <SheetCell
      {...props}
      path={path}
      errors={errors}
      headers={schema.headers}
      onChange={onChange}
      parentValue={value}
      readOnly={readOnly}
      items={items}
      name={name}
    />
  );

  const dataEditor = (props) => (
    <DataEditor
      {...props}
      path={path}
      taskId={taskId}
      stepName={stepName}
      actions={actions}
      rootDocument={rootDocument}
      originDocument={originDocument}
      readOnly={readOnly}
      items={items}
      name={name}
    />
  );

  const sheetRenderer = (props) => (
    <SheetLayout
      {...props}
      readOnly={readOnly}
      items={items}
      name={name}
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
    () => (props) => {
      let { value: cellValue } = props;

      const cellOptions = schema.headers[schema.headers.length - 1][props.col];
      if (cellOptions?.toString && typeof cellOptions.toString === 'string') {
        cellValue = evaluate(cellOptions.toString, props.cell.value);
      }

      if (!React.isValidElement(cellValue) && typeof cellValue !== 'string') {
        cellValue = JSON.stringify(cellValue);
      }

      return <span className="value-viewer">{cellValue}</span>;
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
      parsePaste={parsePaste(items)}
      valueViewer={valueViewer}
      rowRenderer={rowRenderer}
      dataListRef={dataListRef}
      cellRenderer={cellRenderer}
      valueRenderer={valueRenderer}
      sheetRenderer={sheetRenderer}
      onCellsChanged={onCellsChanged}
      data={[].concat(data, input([{}], items))}
    />
  );
};

export default DataTable;
