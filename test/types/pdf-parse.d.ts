declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfPageData {
    view: [number, number, number, number];
  }
  interface PdfParseOptions {
    pagerender?: (pageData: PdfPageData) => string | Promise<string>;
    max?: number;
  }
  interface PdfParseResult {
    numpages: number;
    text: string;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: PdfParseOptions): Promise<PdfParseResult>;
  export = pdfParse;
}
