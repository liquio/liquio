import path from 'path';

import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { Browser, chromium, LaunchOptions, Page } from 'playwright';

import { timeoutExecute } from '@common/utils';
import { log } from '@lib/log';

import { Job } from './job';

// Constants.
const DEFAULT_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--font-render-hinting=none',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--export-tagged-pdf',
    '--disable-features=IsolateOrigins',
    '--disable-site-isolation-trials',
    '--autoplay-policy=user-gesture-required',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-speech-api',
    '--disable-sync',
    '--hide-scrollbars',
    '--ignore-gpu-blacklist',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-zygote',
    '--password-store=basic',
    '--use-gl=swiftshader',
    '--use-mock-keychain',
  ],
};

const LOG_PREFIX = 'pdf-generator';

export class Worker {
  private browser: Browser | null = null;

  private isClosing: boolean = false;

  launchOptions: LaunchOptions = {};

  constructor() {
    this.launchOptions = DEFAULT_LAUNCH_OPTIONS;
  }

  async launch() {
    try {
      this.browser = await chromium.launch(this.launchOptions);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to launch worker: ${error.message || error.toString()}`,
      );
    }
  }

  async handle(job: Job, timeout: number) {
    if (this.isClosing) {
      throw new InternalServerErrorException('Worker is closing');
    }

    const browser = await this.getBrowser();
    if (!browser) {
      throw new InternalServerErrorException('Browser is not defined');
    }

    let page: Page | null = null;
    try {
      const { html, options } = job.data;

      page = await browser.newPage();

      page.on('console', (msg) =>
        log.save(`${LOG_PREFIX}|page-console`, {
          text: msg.text(),
          url: msg.location()?.url,
          type: msg.type(),
        }),
      );

      const hasFooter = html.includes('pageFooter');
      const hasHeader = html.includes('pageHeader');

      if (!hasFooter && !hasHeader) {
        await page.setContent(html, { waitUntil: 'networkidle' });
      } else {
        const mainHtmlContent = await this.processBase64Font(html);

        options.displayHeaderFooter = hasFooter || hasHeader;

        await page.setContent(mainHtmlContent, { waitUntil: 'networkidle' });

        const styles = await page.$$eval('style', (elements) =>
          elements.map((el) => {
            if ('textContent' in el) {
              return el.textContent?.trim();
            }

            return '';
          }),
        );

        const styleTagContent = styles.filter(Boolean).join('\n');

        options.footerTemplate = await this.extractTemplate(page, 'pageFooter', styleTagContent);
        options.headerTemplate = await this.extractTemplate(page, 'pageHeader', styleTagContent);
      }

      const pdfBuffer = await timeoutExecute(page.pdf(options), timeout);
      return pdfBuffer;
    } catch (error) {
      throw new InternalServerErrorException(error.message || error.toString());
    } finally {
      if (page) {
        page.removeAllListeners('console');
        await page.close();
      }
    }
  }

  private async processBase64Font(html: string): Promise<string> {
    const fontUrl: string | undefined = html.match(/src: url\((.*?)\);/)?.[1];
    if (!fontUrl) {
      return html;
    }

    const fontBase64 = await this.loadFont(fontUrl);
    const fileExtension = path.extname(fontUrl).toLowerCase().split('.').pop();
    const mainHtmlContent = html.replace(
      `src: url(${fontUrl});`,
      `src: url(${fontBase64}) format('${fileExtension}');`,
    );

    return mainHtmlContent;
  }

  private extractTemplate(page: Page, elementId: string, styles: string): Promise<string> {
    return page.evaluate(
      ({ id, styles }: { id: string; styles: string }) => {
        const element = document.getElementById(id);
        if (!element) {
          return '<div></div>';
        }

        const template = `
          <style>
            ${styles}
          </style>
          ${element.outerHTML}
        `;

        element.remove();
        return template;
      },
      { id: elementId, styles },
    );
  }

  private async loadFont(url: string) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });

      if (response.status !== 200) {
        throw new InternalServerErrorException(
          `Failed to download font. Status code: ${response.status}`,
        );
      }

      const buffer = Buffer.from(response.data);
      const base64Data = buffer.toString('base64');

      const fileExtension = path.extname(url).toLowerCase();
      let mimeType: string;
      switch (fileExtension) {
        case '.woff':
          mimeType = 'application/font-woff';
          break;
        case '.woff2':
          mimeType = 'application/font-woff2';
          break;
        case '.ttf':
          mimeType = 'application/font-ttf';
          break;
        case '.otf':
          mimeType = 'application/font-otf';
          break;
        default:
          throw new BadRequestException(`Unsupported font format: ${fileExtension}`);
      }

      const dataUri = `data:${mimeType};base64,${base64Data}`;
      return dataUri;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to load font: ${error.message || error.toString()}`,
      );
    }
  }

  private async getBrowser(): Promise<Browser | null> {
    if (!this.browser) {
      await this.launch();
    }

    return this.browser;
  }

  async close() {
    this.isClosing = true;

    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Error closing worker: ${error.message || error.toString()}`,
      );
    } finally {
      this.isClosing = false;
    }
  }
}
