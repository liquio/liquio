// `react-window-infinite-loader` ships no types and there is no @types
// package installed. Scoped to its usage in Select/components/ListboxComponent.tsx.
declare module 'react-window-infinite-loader' {
  import * as React from 'react';
  import type { ListOnItemsRenderedProps } from 'react-window';

  export interface InfiniteLoaderChildProps {
    onItemsRendered: (props: ListOnItemsRenderedProps) => void;
    ref?: React.Ref<unknown>;
  }

  export interface InfiniteLoaderProps {
    isItemLoaded: (index: number) => boolean;
    itemCount: number;
    loadMoreItems: (startIndex: number, stopIndex: number) => void | Promise<void>;
    children: (props: InfiniteLoaderChildProps) => React.ReactElement;
  }

  export default class InfiniteLoader extends React.Component<InfiniteLoaderProps> {}
}
