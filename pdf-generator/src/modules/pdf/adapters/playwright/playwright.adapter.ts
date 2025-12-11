import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PlaywrightConfig } from '@common/types/config.types';
import { Config } from '@lib/config';
import { log } from '@lib/log';
import { PdfGenerator } from '@modules/pdf/interfaces/pdf-generator.interface';
import { PdfGenerationOptions } from '@modules/pdf/pdf.types';

import { Cluster } from './cluster/cluster';
import { PlaywrightOptions } from './playwright.types';

// Constants.
const LOG_PREFIX = 'pdf-generator';

@Injectable()
export class PlaywrightAdapter implements PdfGenerator, OnModuleInit, OnModuleDestroy {
  private defaultOptions: Partial<PlaywrightOptions>;

  private cluster: Cluster;

  constructor() {
    this.defaultOptions = {
      format: 'A4',
      landscape: false,
      scale: 1.35,
      printBackground: true,
      displayHeaderFooter: false,
      tagged: true,
      margin: {
        top: '32px',
        right: '12px',
        bottom: '40px',
        left: '12px',
      },
    } as const;

    const config = Config.get<PlaywrightConfig>('playwright');
    this.cluster = new Cluster(config);

    this.cluster.on('init', ({ workersCount }) => {
      log.save(`${LOG_PREFIX}|cluster-initialized`, { workersCount });
    });

    this.cluster.on('error', (error) => {
      log.save(`${LOG_PREFIX}|cluster-error`, error);
    });

    this.cluster.on('close', (data) => {
      log.save(`${LOG_PREFIX}|cluster-closed`, data);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.cluster.init();
  }

  async onModuleDestroy(): Promise<void> {
    await this.cluster.close();
  }

  /**
   * Generates PDF from HTML template.
   * @param {string} html - HTML content to convert to PDF.
   * @param {PdfGenerationOptions} options - PDF generation options.
   * @returns {Promise<Buffer>} Generated PDF buffer.
   */
  async generateFromTemplate(html: string, options: PdfGenerationOptions): Promise<Buffer> {
    const playwrightOptions = this.getPlaywrightOptions(options);

    try {
      const result = await this.cluster.execute({ html, options: playwrightOptions });
      return result;
    } catch (error) {
      log.save(`${LOG_PREFIX}|generate-from-template-error`, {
        name: error.name,
        error: error.message || error.toString(),
        stack: error.stack,
      });
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * Gets the Playwright options from the PDF generation options.
   * @param {PdfGenerationOptions} options - PDF generation options.
   * @returns {PlaywrightOptions} Playwright options.
   */
  private getPlaywrightOptions(options: PdfGenerationOptions): PlaywrightOptions {
    const playwrightOptions = JSON.parse(JSON.stringify(this.defaultOptions));

    if (options.timeout) {
      playwrightOptions.timeout = options.timeout;
    }

    if (options.format) {
      playwrightOptions.format = options.format;
    }

    if (options.orientation) {
      playwrightOptions.landscape = options.orientation === 'landscape';
    }

    if (options.border && Object.keys(options.border).length > 0) {
      const { top, right, bottom, left } = options.border;
      playwrightOptions.margin = {
        ...(top && { top }),
        ...(right && { right }),
        ...(bottom && { bottom }),
        ...(left && { left }),
      };
    }

    if (options.height) {
      playwrightOptions.height = options.height;
      playwrightOptions.format = undefined;
    }

    if (options.width) {
      playwrightOptions.width = options.width;
      playwrightOptions.format = undefined;
    }

    return playwrightOptions;
  }
}
