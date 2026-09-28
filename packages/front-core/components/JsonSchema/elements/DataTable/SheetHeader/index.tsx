import React from 'react';
import HeaderCell from 'components/JsonSchema/elements/DataTable/SheetHeader/HeaderCell';

interface HeaderCellData {
  label?: React.ReactNode;
  colspan?: number;
  rowSpan?: number;
}

interface SheetHeaderProps {
  headers: Array<Array<HeaderCellData | string>>;
  headAlign?: string;
  headerRef?: React.Ref<HTMLTableSectionElement>;
  showRowNumbers?: boolean;
}

const SheetHeader = ({
  headers,
  headAlign,
  headerRef,
  showRowNumbers = true,
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
            headAlign={headAlign}
          />
        ) : null}
        {header.map((cell, cellKey) => (
          <HeaderCell
            cell={cell}
            key={cellKey}
            cellKey={cellKey}
            headAlign={headAlign}
          />
        ))}
      </tr>
    ))}
  </thead>
);

export default SheetHeader;
