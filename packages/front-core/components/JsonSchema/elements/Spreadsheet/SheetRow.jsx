import React from 'react';

const Row = ({ children, row, schema: { showRowNumbers = true } }) => (
  <tr>
    {showRowNumbers ? <td className="cell read-only">{row + 1}</td> : null}
    {children}
  </tr>
);

export default Row;
