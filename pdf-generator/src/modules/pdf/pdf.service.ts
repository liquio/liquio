import { Inject, Injectable } from '@nestjs/common';

import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { PDF_GENERATOR_TOKEN, PdfGenerator } from './interfaces/pdf-generator.interface';

@Injectable()
export class PdfService {
  constructor(@Inject(PDF_GENERATOR_TOKEN) private readonly pdfGenerator: PdfGenerator) {}

  generatePdf(dto: GeneratePdfDto): Promise<Buffer> {
    return this.pdfGenerator.generateFromTemplate(dto.html, dto.options);
  }
}
