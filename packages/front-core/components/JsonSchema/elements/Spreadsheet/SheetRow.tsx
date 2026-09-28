import React from 'react';

interface RowProps {
  children?: React.ReactNode;
  row: number;
  schema: { showRowNumbers?: boolean };
}

const Row = ({ children, row, schema: { showRowNumbers = true } }: RowProps) => (
  <tr>
    {showRowNumbers ? <td className="cell read-only">{row + 1}</td> : null}
    {children}
  </tr>
);

export default Row;
