// `mgr-pdf-viewer-react` ships no types and there is no @types package installed.
declare module 'mgr-pdf-viewer-react' {
  import { ComponentType, ReactNode } from 'react';

  interface PDFViewerProps {
    navigation?: {
      elements?: {
        previousPageBtn?: ComponentType<Record<string, unknown>>;
        nextPageBtn?: ComponentType<Record<string, unknown>>;
        pages?: ComponentType<Record<string, unknown>>;
      };
    };
    document: { url: string };
    scale?: number;
    loader?: ReactNode;
    [key: string]: unknown;
  }

  const PDFViewer: ComponentType<PDFViewerProps>;
  export default PDFViewer;
}
