// `react-resize-detector` ships no types and there is no @types package installed.
declare module 'react-resize-detector' {
  import { ComponentType } from 'react';

  interface ReactResizeDetectorProps {
    handleWidth?: boolean;
    handleHeight?: boolean;
    onResize?: (width?: number, height?: number) => void;
    [key: string]: unknown;
  }

  const ReactResizeDetector: ComponentType<ReactResizeDetectorProps>;
  export default ReactResizeDetector;
}
