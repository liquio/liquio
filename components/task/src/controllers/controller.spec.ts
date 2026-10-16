import { Controller } from './controller';

describe('Controller.responseFile', () => {
  const run = (contentType: string, fileName?: string) => {
    const headers: Record<string, string> = {};
    const res: any = { set: jest.fn((k: string, v: string) => (headers[k] = v)), send: jest.fn() };
    (global as any).log = { save: jest.fn() };
    new Controller({}).responseFile(res, Buffer.from('x'), contentType, fileName);
    return { headers, res };
  };

  it('always sends nosniff and sends the file', () => {
    const { headers, res } = run('text/html', 'a.html');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.send).toHaveBeenCalled();
  });

  it('uses attachment when a file name is given, even for safe types', () => {
    expect(run('application/pdf', 'My Doc.pdf').headers['Content-Disposition']).toBe('attachment; filename="my_doc.pdf"');
  });

  it('strips quotes, backslashes and line breaks from the file name', () => {
    const value = run('text/plain', 'a"b\\c\r\nd.txt').headers['Content-Disposition'];
    expect(value).toBe('attachment; filename="abc_d.txt"');
  });

  it.each(['text/html', 'text/html; charset=utf-8', 'image/svg+xml', 'application/xhtml+xml', 'text/plain', 'application/javascript'])(
    'forces attachment for unsafe type %s without a name',
    (type) => {
      expect(run(type).headers['Content-Disposition']).toBe('attachment');
    },
  );

  it.each(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf; charset=binary'])(
    'does not force attachment for allow-listed %s without a name',
    (type) => {
      const { headers } = run(type);
      expect(headers['Content-Disposition']).toBeUndefined();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    },
  );
});
