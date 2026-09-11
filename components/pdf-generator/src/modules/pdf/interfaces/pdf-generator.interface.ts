import { PdfGenerationOptions } from '@modules/pdf/pdf.types';

export const PDF_GENERATOR_TOKEN = Symbol('PdfGenerator');

export interface PdfGenerator {
  /**
   * Generates PDF document from a html template with options.
   * @param {string} html - HTML template to generate PDF from.
   * @param {PdfGenerationOptions} options - Configuration options for PDF generation.
   * @returns {Promise<Buffer>} - Promise resolving to PDF buffer.
   */
  generateFromTemplate(html: string, options?: PdfGenerationOptions): Promise<Buffer>;
}
