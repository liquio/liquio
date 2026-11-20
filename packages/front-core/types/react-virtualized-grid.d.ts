// `react-virtualized` ships no bundled types and there is no @types package
// installed; this covers the one submodule import used in this codebase
// (customInterfaces/pages/CabinetMenu/components/IconSelect.tsx).
declare module 'react-virtualized/dist/commonjs/Grid' {
  import React from 'react';

  interface GridCellRendererProps {
    columnIndex: number;
    key: string | number;
    rowIndex: number;
    style: React.CSSProperties;
  }

  interface GridProps {
    width: number;
    height: number;
    columnCount: number;
    columnWidth: number | ((info: { index: number }) => number);
    rowCount: number;
    rowHeight: number | ((info: { index: number }) => number);
    overscanRowCount?: number;
    style?: React.CSSProperties;
    cellRenderer: (props: GridCellRendererProps) => React.ReactNode;
  }

  const Grid: React.ComponentType<GridProps>;
  export default Grid;
}
