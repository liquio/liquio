// `react-datasheet`'s package.json "types" field only covers the package
// root; this deep import has no corresponding declaration file.
declare module 'react-datasheet/lib/DataCell' {
  import * as React from 'react';

  const DataCell: React.ComponentType<Record<string, unknown>>;
  export default DataCell;
}
