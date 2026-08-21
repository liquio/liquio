import React from 'react';

const Row = ({ children, row, showRowNumbers = true }) => (
  <tr>
    {showRowNumbers ? (
      <td className="cell datatable-cell read-only">{row + 1}</td>
    ) : null}
    {children}
  </tr>
);

export default Row;
