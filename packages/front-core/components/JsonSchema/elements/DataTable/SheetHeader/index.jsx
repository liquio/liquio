import React from 'react';
import HeaderCell from 'components/JsonSchema/elements/DataTable/SheetHeader/HeaderCell';

const SheetHeader = ({
  headers,
  headAlign,
  headerRef,
  showRowNumbers = true,
}) => (
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
