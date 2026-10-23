declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: string };

  interface PDFPageViewport {
    width: number;
    height: number;
  }

  interface PDFRenderTask {
    promise: Promise<void>;
  }

  interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFPageViewport;
    render(params: { canvasContext: CanvasRenderingContext2D | null; viewport: PDFPageViewport }): PDFRenderTask;
  }

  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(source: unknown): PDFLoadingTask;
}
