import { Module } from '@nestjs/common';

import { PlaywrightAdapter } from './adapters/playwright/playwright.adapter';
import { PDF_GENERATOR_TOKEN } from './interfaces/pdf-generator.interface';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [PdfController],
  providers: [
    {
      provide: PDF_GENERATOR_TOKEN,
      useClass: PlaywrightAdapter,
    },
    PdfService,
  ],
})
export class PdfModule {}
