import { resetAppContext, setAppContext } from '../lib/context';
import { Controller } from './controller';
import { PublicError } from '../lib/public_error';
import { Exceptions } from '../exceptions';

afterEach(() => {
  resetAppContext();
});

describe('Controller.responseFile', () => {
  const run = (contentType: string, fileName?: string) => {
    const headers: Record<string, string> = {};
    const res: any = { set: jest.fn((k: string, v: string) => (headers[k] = v)), send: jest.fn() };
    setAppContext({ log: { save: jest.fn() } });
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

describe('Controller.responseError disclosure', () => {
  const run = (error: any, status?: number, details?: any) => {
    const res: any = { req: { originalUrl: '/x', method: 'GET' }, status: jest.fn().mockReturnThis(), send: jest.fn() };
    const save = jest.fn();
    setAppContext({ log: { save } });
    new Controller({}).responseError(res, error, status, details);
    return { res, body: res.send.mock.calls[0][0], save };
  };

  it('hides the text and details of a non-public Error on 500 but logs it', () => {
    const error = Object.assign(new Error('SequelizeDatabaseError: SELECT * FROM users'), { details: [{ message: 'sql' }] });
    const { res, body, save } = run(error, undefined, error.details);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.error.message).toBe('Internal server error');
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/Sequelize|SELECT/);
    expect(save).toHaveBeenCalledWith('response-error-hidden', expect.objectContaining({ message: error.message }));
  });

  it('hides a non-public Error status text for a 4xx status', () => {
    expect(run(new Error('jwt malformed'), 401).body.error.message).toBe('Unauthorized');
  });

  it('keeps intentional messages and their status (PublicError, Exceptions)', () => {
    expect(run(new PublicError('Task is already finished.')).body.error.message).toBe('Task is already finished.');
    const workflow = run(new Exceptions.WORKFLOW('Tag already exists.'));
    expect(workflow.res.status).toHaveBeenCalledWith(500);
    expect(workflow.body.error.message).toBe('Tag already exists.');
    const unit = run(new Exceptions.UNIT("Can't save - conflicts in fields: members.", 'Conflict', 409));
    expect(unit.res.status).toHaveBeenCalledWith(409);
    expect(unit.body.error.message).toBe("Can't save - conflicts in fields: members.");
  });

  it('keeps trusted string and object messages', () => {
    expect(run('Not found.', 404).body.error.message).toBe('Not found.');
    expect(run({ message: 'P7S not found.' }, 404).body.error.message).toBe('P7S not found.');
  });

  it('does not leak a non-public Error inside details of a public error', () => {
    const { body } = run(new PublicError('Bad'), 400, [new Error('SELECT secret')]);
    expect(body.details).toEqual([{ message: 'Internal server error' }]);
  });
});
