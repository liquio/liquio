import React from 'react';

interface RowProps {
  children?: React.ReactNode;
  row: number;
  showRowNumbers?: boolean;
}

const Row = ({ children, row, showRowNumbers = true }: RowProps) => (
  <tr>
    {showRowNumbers ? (
      <td className="cell datatable-cell read-only">{row + 1}</td>
    ) : null}
    {children}
  </tr>
);

export default Row;
