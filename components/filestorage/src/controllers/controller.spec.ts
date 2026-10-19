import { Controller } from './controller';

describe('Controller', () => {
  const makeRes = () => {
    const headers: Record<string, string> = {};
    return { headers, set: jest.fn((k, v) => (headers[k] = v)), send: jest.fn() };
  };

  describe('responseFile', () => {
    it.each([undefined, '', '   '])('should force attachment and nosniff for empty name %p', (name) => {
      const res = makeRes();
      new Controller().responseFile(res, Buffer.from('<html>'), 'text/html', undefined, name);
      expect(res.headers['Content-Disposition']).toBe('attachment; filename="file"');
      expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(res.send).toHaveBeenCalled();
    });

    it('should set attachment and nosniff when no name argument is passed (preview)', () => {
      const res = makeRes();
      new Controller().responseFile(res, Buffer.from('x'), 'image/png');
      expect(res.headers['Content-Disposition']).toMatch(/^attachment/);
      expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('buildContentDisposition', () => {
    it('should strip CR/LF/quotes and encode non-ASCII names', () => {
      const value = Controller.buildContentDisposition('a"b\r\ncфайл.html');
      expect(value).not.toMatch(/[\r\n]/);
      expect(value).toMatch(/^attachment; filename="[a-zA-Z0-9._-]+"; filename\*=UTF-8''[A-Za-z0-9%._-]+$/);
      expect(value).toContain("filename*=UTF-8''abc%D1%84%D0%B0%D0%B9%D0%BB.html");
    });
  });
});
