import http from 'http';
import { AddressInfo } from 'net';

import axios from 'axios';

import { log } from '@lib/log';
import { Job } from './job';
import { Worker } from './worker';

jest.mock('@lib/log', () => ({ log: { save: jest.fn() } }));

const PUBLIC_LOOKUP = jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
const WOFF = Buffer.from('wOFFfontbytes');

function makeJob(html: string): Job {
  const options = { format: 'A4', margin: { top: '1px', right: '1px', bottom: '1px', left: '1px' } } as never;
  return new Job({ html, options }, { onSuccess: jest.fn(), onError: jest.fn() });
}

describe('Worker', () => {
  describe('chromium sandbox', () => {
    it('keeps the sandbox on by default', () => {
      const { args } = new Worker().launchOptions;
      expect(args).not.toContain('--no-sandbox');
      expect(args).not.toContain('--disable-setuid-sandbox');
    });

    it('adds --no-sandbox only when noSandbox is set', () => {
      const { args } = new Worker({ noSandbox: true }).launchOptions;
      expect(args).toContain('--no-sandbox');
      expect(args).toContain('--disable-setuid-sandbox');
      expect(new Worker().launchOptions.args).not.toContain('--no-sandbox');
    });

    it('launches a real sandboxed browser and renders a pdf', async () => {
      const worker = new Worker();
      try {
        const pdf = await worker.handle(makeJob('<p>sandbox</p>'), 20_000);
        expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
      } finally {
        await worker.close();
      }
    }, 30_000);
  });

  describe('browser request filtering', () => {
    let server: http.Server;
    let port: number;
    let hits: string[];
    let worker: Worker;

    beforeAll(async () => {
      server = http.createServer((req, res) => {
        hits.push(req.url as string);
        if (req.url === '/redirect') {
          res.writeHead(302, { Location: `http://127.0.0.1:${port}/secret-after-redirect.png` }).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'image/png' }).end(Buffer.alloc(10));
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      port = (server.address() as AddressInfo).port;
    });

    afterAll(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    beforeEach(() => {
      hits = [];
    });

    afterEach(async () => {
      await worker?.close();
    });

    it('never reaches loopback via img, iframe, script, fetch, popup, stylesheet or font', async () => {
      worker = new Worker();
      const base = `http://127.0.0.1:${port}`;
      const html = `<html><head>
        <link rel="stylesheet" href="${base}/style.css">
        <style>@font-face { font-family: x; src: url(${base}/font.woff); } body { font-family: x; }</style>
        <script src="${base}/script.js"></script>
      </head><body>
        <img src="${base}/img.png"><iframe src="${base}/iframe.html"></iframe>
        <script>fetch('${base}/fetch').catch(() => {}); window.open('${base}/popup');</script>
      </body></html>`;

      const pdf = await worker.handle(makeJob(html), 30_000);

      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
      expect(hits).toEqual([]);
    });

    it('blocks file: URLs and does not render their content', async () => {
      worker = new Worker();
      const html = '<html><body>visible<iframe src="file:///etc/hostname"></iframe><img src="file:///etc/hostname"></body></html>';
      const pdf = await worker.handle(makeJob(html), 30_000);
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('checks every redirect hop of an allowed host', async () => {
      worker = new Worker({ allowedHosts: ['assets.test'], lookup: PUBLIC_LOOKUP });
      const makeRoute = (url: string, response?: unknown) => ({
        request: () => ({ url: () => url, resourceType: () => 'image' }),
        fetch: jest.fn().mockResolvedValue(response),
        fulfill: jest.fn(),
        abort: jest.fn(),
        continue: jest.fn(),
      });

      const first = makeRoute('http://assets.test/redirect', { headers: () => ({ location: 'http://127.0.0.1:1/secret.png' }) });
      await worker.handleRoute(first as never);
      // The redirect response goes back to the browser as is, it is not followed here.
      expect(first.fetch).toHaveBeenCalledWith({ maxRedirects: 0 });
      expect(first.fulfill).toHaveBeenCalledTimes(1);

      // The browser then requests the target, which is blocked.
      const second = makeRoute('http://127.0.0.1:1/secret.png');
      await worker.handleRoute(second as never);
      expect(second.abort).toHaveBeenCalledWith('blockedbyclient');
      expect(second.fetch).not.toHaveBeenCalled();
      expect(second.continue).not.toHaveBeenCalled();
    });

    it('still renders data URIs and inline content', async () => {
      worker = new Worker();
      const html = '<html><body><img src="data:image/png;base64,iVBORw0KGgo="><p>text</p></body></html>';
      const pdf = await worker.handle(makeJob(html), 30_000);
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('page console logging', () => {
    let worker: Worker;
    const saved = () => (log.save as jest.Mock).mock.calls;
    const consoleEntries = () => saved().filter(([type]) => type === 'pdf-generator|page-console');

    beforeEach(() => (log.save as jest.Mock).mockClear());

    afterEach(async () => {
      await worker?.close();
    });

    it('logs at most N console messages per job plus one summary', async () => {
      worker = new Worker({ consoleLogLevels: ['log', 'error'], consoleLogMaxMessages: 5 });
      await worker.handle(makeJob('<html><body><script>for (let i = 0; i < 1000; i++) console.log("m" + i);</script></body></html>'), 30_000);

      expect(consoleEntries()).toHaveLength(5);
      const summary = saved().filter(([type]) => type === 'pdf-generator|page-console-summary');
      expect(summary).toHaveLength(1);
      expect(summary[0][1]).toEqual({ dropped: 995 });
    });

    it('logs only warning and error by default', async () => {
      worker = new Worker();
      await worker.handle(
        makeJob('<html><body><script>console.log("a"); console.info("b"); console.warn("c"); console.error("d");</script></body></html>'),
        30_000,
      );

      expect(consoleEntries().map(([, data]) => data.type)).toEqual(['warning', 'error']);
    });

    it('truncates long text', async () => {
      worker = new Worker({ consoleLogLevels: ['error'] });
      await worker.handle(makeJob('<html><body><script>console.error("x".repeat(100000));</script></body></html>'), 30_000);

      const [[, data]] = consoleEntries();
      expect(data.text).toHaveLength(500);
    });
  });

  describe('font inlining (server-side)', () => {
    let getSpy: jest.SpyInstance;

    const fontHtml = (src: string) =>
      `<html><head><style>@font-face { font-family: f; src: url(${src}); }</style></head><body><div id="pageFooter">f</div></body></html>`;
    const inline = (worker: Worker, html: string): Promise<string> =>
      (worker as never as { processBase64Font(h: string): Promise<string> }).processBase64Font(html);

    beforeEach(() => {
      PUBLIC_LOOKUP.mockClear();
      getSpy = jest.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: WOFF, headers: { 'content-type': 'font/woff' } });
    });

    afterEach(() => getSpy.mockRestore());

    it.each([
      'http://127.0.0.1:8080/f.woff',
      'http://localhost/f.woff',
      'http://169.254.169.254/f.woff',
      'http://[::1]/f.woff',
      'file:///etc/passwd.woff',
    ])('does not request %s even if it is allowlisted', async (src) => {
      const worker = new Worker({ allowedHosts: ['127.0.0.1', 'localhost', '169.254.169.254', '::1'] });
      const html = fontHtml(src);
      expect(await inline(worker, html)).toBe(html);
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('does not request a host that is not allowlisted', async () => {
      const html = fontHtml('https://fonts.test/f.woff');
      expect(await inline(new Worker({ lookup: PUBLIC_LOOKUP }), html)).toBe(html);
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('does not request an allowlisted host that resolves to a private address', async () => {
      const lookup = jest.fn().mockResolvedValue([{ address: '10.0.0.7', family: 4 }]);
      const html = fontHtml('https://fonts.test/f.woff');
      expect(await inline(new Worker({ allowedHosts: ['fonts.test'], lookup }), html)).toBe(html);
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('does not let a #.woff fragment or a query pass the extension check', async () => {
      const worker = new Worker({ allowedHosts: ['fonts.test'], lookup: PUBLIC_LOOKUP });
      for (const src of ['https://fonts.test/internal#.woff', 'https://fonts.test/internal?x=.woff']) {
        const html = fontHtml(src);
        expect(await inline(worker, html)).toBe(html);
      }
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('inlines an allowlisted font without following redirects', async () => {
      const worker = new Worker({ allowedHosts: ['fonts.test'], lookup: PUBLIC_LOOKUP });
      const result = await inline(worker, fontHtml('"https://fonts.test/fonts/f.woff?v=1"'));

      expect(result).toContain(`url(data:application/font-woff;base64,${WOFF.toString('base64')}) format('woff')`);
      expect(result).not.toContain('fonts.test');
      expect(getSpy).toHaveBeenCalledWith(
        'https://fonts.test/fonts/f.woff?v=1',
        expect.objectContaining({ maxRedirects: 0, maxContentLength: 5 * 1024 * 1024, timeout: expect.any(Number) }),
      );
    });

    it('inlines every url() of every @font-face, quoted or not', async () => {
      const worker = new Worker({ allowedHosts: ['fonts.test'], lookup: PUBLIC_LOOKUP });
      const html = `<style>@font-face{font-family:a;src:url('https://fonts.test/a.woff2') format('woff2'),url("https://fonts.test/a.ttf");}
        @font-face{font-family:b;src:url( https://fonts.test/b.otf );}</style>`;
      const result = await inline(worker, html);

      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(result).not.toContain('fonts.test');
      expect(result).toContain("format('woff2')");
      expect(result).toContain("format('truetype')");
      expect(result).toContain("format('opentype')");
    });

    it('rejects a response that is not a font', async () => {
      getSpy.mockResolvedValue({ status: 200, data: Buffer.from('<html>secret</html>'), headers: { 'content-type': 'text/html' } });
      const worker = new Worker({ allowedHosts: ['fonts.test'], lookup: PUBLIC_LOOKUP });
      await expect(inline(worker, fontHtml('https://fonts.test/f.woff'))).rejects.toThrow('Unexpected content type');
    });

    it('fails on a redirect response', async () => {
      getSpy.mockRejectedValue(new Error('Maximum number of redirects exceeded'));
      const worker = new Worker({ allowedHosts: ['fonts.test'], lookup: PUBLIC_LOOKUP });
      await expect(inline(worker, fontHtml('https://fonts.test/f.woff'))).rejects.toThrow('Failed to load font');
    });

    it('leaves data URI fonts untouched', async () => {
      const html = fontHtml('data:font/woff;base64,AAAA');
      expect(await inline(new Worker(), html)).toBe(html);
      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});
