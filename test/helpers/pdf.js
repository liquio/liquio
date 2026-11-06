const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/**
 * Text of a PDF, whitespace collapsed to single spaces.
 * @param {Buffer} buffer PDF file.
 * @returns {Promise<string>}
 */
async function extractPdfText(buffer) {
  const result = await pdfParse(new Uint8Array(buffer));
  return result.text.replace(/\s+/g, ' ').trim();
}

/**
 * Page sizes of a PDF in points.
 * @param {Buffer} buffer PDF file.
 * @returns {Promise<Array<{ width: number, height: number }>>}
 */
async function getPdfPageSizes(buffer) {
  const sizes = [];
  const pagerender = (pageData) => {
    const [x0, y0, x1, y1] = pageData.view;
    sizes.push({ width: x1 - x0, height: y1 - y0 });
    return '';
  };
  await pdfParse(new Uint8Array(buffer), { pagerender });
  return sizes;
}

module.exports = { extractPdfText, getPdfPageSizes };
