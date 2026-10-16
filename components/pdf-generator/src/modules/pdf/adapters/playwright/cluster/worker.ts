import path from 'path';

import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { Browser, BrowserContext, chromium, LaunchOptions, Page, Route } from 'playwright';

import { timeoutExecute } from '@common/utils';
import { log } from '@lib/log';
import { sanitizeUrl, sanitizeUrlsInText } from '@lib/log/helpers';
import { Job } from './job';
import { checkUrl, HostLookup, ResolvedAddress } from './url-guard';

// Constants.
// Do not add flags that weaken isolation (--disable-web-security, --disable-features=IsolateOrigins,
// --disable-site-isolation-trials, --disable-popup-blocking): templates are user-supplied HTML.
const DEFAULT_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--font-render-hinting=none',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--export-tagged-pdf',
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

const FONT_DOWNLOAD_TIMEOUT = 10_000;
const FONT_MAX_SIZE = 5 * 1024 * 1024;
const FONT_FORMATS: Record<string, { mimeType: string; format: string }> = {
  '.woff': { mimeType: 'application/font-woff', format: 'woff' },
  '.woff2': { mimeType: 'application/font-woff2', format: 'woff2' },
  '.ttf': { mimeType: 'application/font-ttf', format: 'truetype' },
  '.otf': { mimeType: 'application/font-otf', format: 'opentype' },
};
const FONT_CONTENT_TYPE = /^(font\/|application\/(x-)?font|application\/octet-stream|binary\/octet-stream)/i;

const LOG_PREFIX = 'pdf-generator';

// Page-controlled console output is bounded per job: only these types, this many messages, this long.
const DEFAULT_CONSOLE_LOG_LEVELS = ['warning', 'error'];
const DEFAULT_CONSOLE_LOG_MAX_MESSAGES = 20;
const CONSOLE_LOG_MAX_TEXT_LENGTH = 500;

export type WorkerOptions = {
  // Hostnames http(s) resources may be loaded from. Empty list blocks all remote resources.
  allowedHosts?: string[];
  // Custom DNS lookup (for tests).
  lookup?: HostLookup;
  // Page console message types that are logged (Playwright types: log, debug, info, error, warning...).
  consoleLogLevels?: string[];
  // Max page console messages logged per job, the rest is only counted.
  consoleLogMaxMessages?: number;
};

export class Worker {
  private browser: Browser | null = null;

  private isClosing: boolean = false;

  private allowedHosts: string[];

  private lookup?: HostLookup;

  private consoleLogLevels: string[];

  private consoleLogMaxMessages: number;

  launchOptions: LaunchOptions = {};

  constructor({ allowedHosts = [], lookup, consoleLogLevels, consoleLogMaxMessages }: WorkerOptions = {}) {
    this.consoleLogLevels = consoleLogLevels ?? DEFAULT_CONSOLE_LOG_LEVELS;
    this.consoleLogMaxMessages = consoleLogMaxMessages ?? DEFAULT_CONSOLE_LOG_MAX_MESSAGES;
    this.launchOptions = DEFAULT_LAUNCH_OPTIONS;
    this.allowedHosts = allowedHosts;
    this.lookup = lookup;
  }

  async launch() {
    try {
      this.browser = await chromium.launch(this.launchOptions);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to launch worker: ${error.message || error.toString()}`);
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

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let consoleDropped = 0;
    try {
      const { html, options } = job.data;

      context = await browser.newContext({ acceptDownloads: false });

      // Rules on the context apply to every page, iframe, popup and redirect hop.
      await context.route('**/*', (route) => this.handleRoute(route));

      page = await context.newPage();

      let consoleLogged = 0;
      page.on('console', (msg) => {
        const type = msg.type();
        if (!this.consoleLogLevels.includes(type)) {
          return;
        }

        if (consoleLogged >= this.consoleLogMaxMessages) {
          consoleDropped++;
          return;
        }

        consoleLogged++;
        log.save(`${LOG_PREFIX}|page-console`, {
          text: msg.text().slice(0, CONSOLE_LOG_MAX_TEXT_LENGTH),
          url: sanitizeUrl(msg.location()?.url),
          type,
        });
      });

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
      }

      if (consoleDropped > 0) {
        log.save(`${LOG_PREFIX}|page-console-summary`, { dropped: consoleDropped });
      }

      if (context) {
        await context.close();
      }
    }
  }

  async handleRoute(route: Route) {
    const request = route.request();
    const url = request.url();

    const result = await checkUrl(url, { allowedHosts: this.allowedHosts, lookup: this.lookup });
    if (!result.allowed) {
      log.save(`${LOG_PREFIX}|request-blocked`, {
        url: sanitizeUrl(url),
        reason: result.reason,
        resourceType: request.resourceType(),
      });
      await route.abort('blockedbyclient');
      return;
    }

    if (!/^https?:/i.test(url)) {
      await route.continue();
      return;
    }

    // Chromium does not route redirect hops of a continued request, so remote requests are made here without
    // following redirects: a 3xx response goes back to the browser, which requests the target again through
    // this handler, so every hop is checked.
    try {
      const response = await route.fetch({ maxRedirects: 0 });
      const headers = { ...response.headers() };
      if (request.resourceType() === 'font') {
        // Cross-origin fonts require CORS, the page origin is opaque.
        headers['access-control-allow-origin'] = '*';
      }

      await route.fulfill({ response, headers });
    } catch (error) {
      log.save(`${LOG_PREFIX}|request-error`, { url: sanitizeUrl(url), error: sanitizeUrlsInText(error.message || error.toString()) });
      await route.abort('failed');
    }
  }

  /**
   * Inlines remote fonts of @font-face rules as data URIs (header/footer templates can't load remote fonts).
   * Fonts that are not allowed are left untouched, the browser blocks them.
   */
  private async processBase64Font(html: string): Promise<string> {
    const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
    const urlRegex = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]*))\s*\)(\s*format\([^)]*\))?/gi;

    const replacements = new Map<string, string>();
    const blocks = html.match(fontFaceRegex) || [];
    for (const block of blocks) {
      for (const match of block.matchAll(urlRegex)) {
        const fontUrl = (match[1] ?? match[2] ?? match[3] ?? '').trim();
        if (!/^https?:/i.test(fontUrl) || replacements.has(match[0])) {
          continue;
        }

        const inlined = await this.loadFont(fontUrl);
        if (inlined) {
          replacements.set(match[0], match[4] ? `url(${inlined.dataUri})${match[4]}` : `url(${inlined.dataUri}) format('${inlined.format}')`);
        }
      }
    }

    if (replacements.size === 0) {
      return html;
    }

    return html.replace(fontFaceRegex, (block) => block.replace(urlRegex, (whole) => replacements.get(whole) ?? whole));
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

  private async loadFont(fontUrl: string): Promise<{ dataUri: string; format: string } | null> {
    const check = await checkUrl(fontUrl, { allowedHosts: this.allowedHosts, lookup: this.lookup, remoteOnly: true });
    if (!check.allowed || !check.url || !check.addresses) {
      log.save(`${LOG_PREFIX}|font-blocked`, { url: sanitizeUrl(fontUrl), reason: check.reason });
      return null;
    }

    // Extension is checked on the path, not on the raw string (fragment/query must not count).
    const fileExtension = path.extname(check.url.pathname).toLowerCase();
    const font = FONT_FORMATS[fileExtension];
    if (!font) {
      log.save(`${LOG_PREFIX}|font-blocked`, { url: sanitizeUrl(fontUrl), reason: 'unsupported-format' });
      return null;
    }

    try {
      // Connect to the address that was validated, not to a freshly resolved one.
      const [{ address, family }] = check.addresses;
      const response = await axios.get(check.url.href, {
        responseType: 'arraybuffer',
        timeout: FONT_DOWNLOAD_TIMEOUT,
        maxContentLength: FONT_MAX_SIZE,
        maxRedirects: 0,
        lookup: ((_host: string, opts: unknown, callback: (...args: unknown[]) => void) => {
          const resolved: ResolvedAddress = { address, family };
          if (typeof opts === 'object' && opts !== null && (opts as { all?: boolean }).all) {
            callback(null, [resolved]);
          } else {
            callback(null, resolved.address, resolved.family);
          }
        }) as never,
      });

      if (response.status !== 200) {
        throw new Error(`Status code: ${response.status}`);
      }

      const contentType = String(response.headers?.['content-type'] ?? '');
      if (!FONT_CONTENT_TYPE.test(contentType)) {
        throw new Error(`Unexpected content type: ${contentType.slice(0, 100)}`);
      }

      const dataUri = `data:${font.mimeType};base64,${Buffer.from(response.data).toString('base64')}`;
      return { dataUri, format: font.format };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to load font: ${error.message || error.toString()}`);
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
      throw new InternalServerErrorException(`Error closing worker: ${error.message || error.toString()}`);
    } finally {
      this.isClosing = false;
    }
  }
}
