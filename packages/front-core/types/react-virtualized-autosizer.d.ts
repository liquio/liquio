// `react-virtualized` ships no types and there is no @types package
// installed. Scoped to AutoSizer's usage in DataSheet/index.tsx.
declare module 'react-virtualized/dist/commonjs/AutoSizer' {
  import * as React from 'react';

  export interface AutoSizerSize {
    width: number;
    height: number;
  }

  export interface AutoSizerProps {
    children: (size: AutoSizerSize) => React.ReactNode;
    disableWidth?: boolean;
    disableHeight?: boolean;
  }

  export default class AutoSizer extends React.Component<AutoSizerProps> {}
}
