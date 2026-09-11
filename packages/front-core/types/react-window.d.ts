// `react-window` ships no types and there is no @types package installed.
// Scoped to VariableSizeList's usage in Select/components/ListboxComponent.tsx.
declare module 'react-window' {
  import * as React from 'react';

  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
    data: unknown;
  }

  export interface ListOnItemsRenderedProps {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }

  export interface VariableSizeListRef {
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  export interface VariableSizeListProps {
    children: (props: ListChildComponentProps) => React.ReactElement;
    onItemsRendered?: (props: ListOnItemsRenderedProps) => void;
    itemData?: unknown;
    height: number | string;
    width: number | string;
    outerElementType?: React.ElementType;
    innerElementType?: React.ElementType;
    itemSize: (index: number) => number;
    overscanCount?: number;
    itemCount: number;
  }

  export class VariableSizeList extends React.Component<VariableSizeListProps> {
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }
}
