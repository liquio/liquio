import { Body, Controller, Post, StreamableFile } from '@nestjs/common';

import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post()
  async generatePdf(@Body() dto: GeneratePdfDto): Promise<StreamableFile> {
    const file = await this.pdfService.generatePdf(dto);

    return new StreamableFile(file, {
      type: 'application/pdf',
    });
  }
}
