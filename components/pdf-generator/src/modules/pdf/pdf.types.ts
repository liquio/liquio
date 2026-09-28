export type Orientation = 'landscape' | 'portrait';

export type PdfGenerationOptions = Partial<{
  /**
   * Timout for PDF generation.
   */
  timeout: number;

  /**
   * PDF page format (A4, etc).
   */
  format: string;

  /**
   * Portrait or landscape orientation.
   */
  orientation: Orientation;

  /**
   * Page border in pixels or specific units.
   */
  border: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };

  /**
   * Page width in pixels or specific units.
   */
  width: string;

  /**
   * Page height in pixels or specific units.
   */
  height: string;
}>;
