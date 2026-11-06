const logSave = jest.fn();
const appConfig: any = {};

jest.mock('./context', () => ({
  getConfig: () => appConfig,
  getLog: () => ({ save: logSave }),
}));

const postMock = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { post: postMock } }));

import { renderPdf, toPdfGeneratorOptions } from './pdf_generator';

describe('pdf_generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appConfig.pdf_generator = { url: 'http://pdf/pdf', basicAuthToken: 'Basic secret', requestTimeout: 5000 };
  });

  describe('toPdfGeneratorOptions', () => {
    it('should keep allowed keys and list dropped ones', () => {
      const { options, dropped } = toPdfGeneratorOptions({
        timeout: '3000',
        format: 'A4',
        orientation: 'landscape',
        width: '10cm',
        height: '20cm',
        border: { top: '1cm', left: '2cm', extra: 'x' },
        footer: { height: '1cm' },
        header: {},
        phantomArgs: [],
        script: 'x.js',
        base: 'file:///',
      });

      expect(options).toEqual({
        timeout: 3000,
        format: 'A4',
        orientation: 'landscape',
        width: '10cm',
        height: '20cm',
        border: { top: '1cm', left: '2cm' },
      });
      expect(dropped).toEqual(['footer', 'header', 'phantomArgs', 'script', 'base']);
    });

    it('should drop a non-numeric timeout and an empty border', () => {
      const { options } = toPdfGeneratorOptions({ timeout: 'abc', border: { extra: 'x' } });

      expect(options).toEqual({});
    });
  });

  describe('renderPdf', () => {
    it('should throw when config is missing', async () => {
      appConfig.pdf_generator = { url: 'http://pdf/pdf' };

      await expect(renderPdf('<p/>', {})).rejects.toThrow('PDF generator config is missing url or basicAuthToken');
    });

    it('should post html and options and return a buffer', async () => {
      postMock.mockResolvedValue({ data: new Uint8Array([1, 2, 3]).buffer });

      const result = await renderPdf('<p>x</p>', { format: 'A4', footer: {} });

      expect(postMock).toHaveBeenCalledWith(
        'http://pdf/pdf',
        { html: '<p>x</p>', options: { format: 'A4' } },
        expect.objectContaining({
          headers: { Authorization: 'Basic secret', 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
          timeout: 5000,
        }),
      );
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should not log the token', async () => {
      postMock.mockResolvedValue({ data: new ArrayBuffer(1) });

      await renderPdf('<p/>', { footer: {}, script: 'x' });

      expect(logSave).toHaveBeenCalledWith('pdf-generator-options-dropped', { keys: ['footer', 'script'] });
      expect(JSON.stringify(logSave.mock.calls)).not.toContain('Basic');
    });

    it('should propagate request errors', async () => {
      postMock.mockRejectedValue(new Error('Request failed with status code 500'));

      await expect(renderPdf('<p/>', {})).rejects.toThrow('Request failed with status code 500');
    });
  });
});
