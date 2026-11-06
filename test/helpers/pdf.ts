import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * Text of a PDF, whitespace collapsed to single spaces.
 * @param buffer PDF file.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(new Uint8Array(buffer));
  return result.text.replace(/\s+/g, ' ').trim();
}

/**
 * Page sizes of a PDF in points.
 * @param buffer PDF file.
 */
async function getPdfPageSizes(buffer: Buffer): Promise<Array<{ width: number; height: number }>> {
  const sizes: Array<{ width: number; height: number }> = [];
  const pagerender = (pageData: { view: [number, number, number, number] }) => {
    const [x0, y0, x1, y1] = pageData.view;
    sizes.push({ width: x1 - x0, height: y1 - y0 });
    return '';
  };
  await pdfParse(new Uint8Array(buffer), { pagerender });
  return sizes;
}

export { extractPdfText, getPdfPageSizes };
