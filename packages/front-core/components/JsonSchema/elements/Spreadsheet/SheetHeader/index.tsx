import React from 'react';
import HeaderCell from 'components/JsonSchema/elements/Spreadsheet/SheetHeader/HeaderCell';

interface HeaderCellData {
  label?: React.ReactNode;
  colspan?: number;
  rowSpan?: number;
}

interface SheetHeaderProps {
  data?: Array<Record<string, { value?: unknown }>>;
  headers: Array<Array<HeaderCellData | string>>;
  headAlign?: string;
  headFontSize?: number;
  headerRef?: React.Ref<HTMLTableSectionElement>;
  schema: { showRowNumbers?: boolean };
  task?: { document?: { data: Record<string, unknown> } };
  pathIndex?: { index: number };
}

const SheetHeader = ({
  data,
  headers,
  headAlign,
  headFontSize,
  headerRef,
  schema: { showRowNumbers = true },
  task,
  pathIndex,
}: SheetHeaderProps) => (
  <thead ref={headerRef}>
    {headers.map((header, headerKey) => (
      <tr key={headerKey}>
        {showRowNumbers && headerKey === 0 ? (
          <HeaderCell
            cell={{
              label: '№',
              rowSpan: headers.length,
            }}
            data={data}
            staticWidth={1}
            headAlign={headAlign}
            headFontSize={headFontSize}
            task={task}
            pathIndex={pathIndex}
          />
        ) : null}
        {header.map((cell, cellKey) => (
          <HeaderCell
            cell={cell}
            data={data}
            key={cellKey}
            cellKey={cellKey}
            headAlign={headAlign}
            headFontSize={headFontSize}
            task={task}
            pathIndex={pathIndex}
          />
        ))}
      </tr>
    ))}
  </thead>
);

export default SheetHeader;
