// `react-virtualized` ships no bundled types and there is no @types package
// installed; this covers the one submodule import used in this codebase.
declare module 'react-virtualized/dist/commonjs/AutoSizer' {
  import React from 'react';

  interface AutoSizerRenderProps {
    height: number;
    width: number;
  }

  interface AutoSizerProps {
    children: (size: AutoSizerRenderProps) => React.ReactNode;
    disableWidth?: boolean;
    disableHeight?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onResize?: (size: AutoSizerRenderProps) => void;
    defaultWidth?: number;
    defaultHeight?: number;
  }

  const AutoSizer: React.ComponentType<AutoSizerProps>;
  export default AutoSizer;
}
