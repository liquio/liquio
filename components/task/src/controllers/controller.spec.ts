jest.mock('@liquio/back-core', () => ({ getTraceId: () => 'trace', getTraceMeta: () => ({}), appendTraceMeta: jest.fn() }));

import { Controller } from './controller';
import { BadRequestError, ForbiddenError, SequelizeDbError } from '../lib/errors';
import { getLog, resetAppContext, setAppContext } from '../lib/context';

describe('Controller.responseFile', () => {
  afterEach(() => resetAppContext());

  const run = (contentType: string, fileName?: string) => {
    const headers: Record<string, string> = {};
    const res: any = { set: jest.fn((k: string, v: string) => (headers[k] = v)), send: jest.fn() };
    setAppContext({ log: { save: jest.fn() } as any });
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

describe('Controller.responseError', () => {
  const run = async (error: any, status?: number, details?: any) => {
    const res: any = { req: { originalUrl: '/x', method: 'GET' }, status: jest.fn().mockReturnThis(), send: jest.fn(), set: jest.fn() };
    setAppContext({ log: { save: jest.fn().mockResolvedValue('log-id') } as any });
    setAppContext({ config: { log: {} } });
    await new Controller({}).responseError(res, error, status, details);
    return { res, body: res.send.mock.calls[0][0], log: getLog().save as jest.Mock };
  };

  it('hides SQL text, cause and code of a non-public error on 500 but logs them', async () => {
    const error = Object.assign(new SequelizeDbError(new Error('relation "users" does not exist')), { code: '42P01' });
    const { res, body, log } = await run(error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body).toEqual({ error: { message: 'Internal server error', details: undefined, code: undefined }, traceId: 'trace' });
    expect(JSON.stringify(body)).not.toContain('users');
    expect(log.mock.calls[0][1].error.message).toContain('relation "users" does not exist');
  });

  it('hides details taken from a non-public error but keeps explicit details', async () => {
    const error = Object.assign(new Error('secret'), { details: { sql: 'SELECT 1' } });
    expect((await run(error, 500, error.details)).body.error.details).toBeUndefined();
    expect((await run(error, 500, { documentId: 'd' })).body.error.details).toEqual({ documentId: 'd' });
  });

  it('gives a non-public error on a 4xx status only the status text', async () => {
    const { body } = await run(new Error('jwt malformed: secret'), 401);
    expect(body.error.message).toBe('Unauthorized');
  });

  it('keeps messages and details of intentional errors', async () => {
    const error = Object.assign(new BadRequestError('Wrong input.'), { details: [{ message: 'bad field' }] });
    const { res, body } = await run(error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(body.error.message).toBe('BadRequestError: Wrong input.');
    expect(body.error.details).toEqual([{ message: 'bad field' }]);
  });

  it('keeps the message of an exposed error (only one draft)', async () => {
    const error = Object.assign(new Error('Only one draft allowed.'), { expose: true, details: { message: 'm' } });
    const { body } = await run(error);

    expect(body.error.message).toBe('Error: Only one draft allowed.');
    expect(body.error.details).toEqual({ message: 'm' });
  });

  it('keeps trusted string messages', async () => {
    const { res, body } = await run('User should be unit head.', 401);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(body.error.message).toBe('User should be unit head.');
  });
});

describe('Controller.responseError keeps messages matched by front-core', () => {
  const run = async (error: any, status?: number) => {
    const res: any = { req: { originalUrl: '/x', method: 'GET' }, status: jest.fn().mockReturnThis(), send: jest.fn(), set: jest.fn() };
    setAppContext({ log: { save: jest.fn().mockResolvedValue('log-id') } as any });
    setAppContext({ config: { log: {} } });
    await new Controller({}).responseError(res, error, status);
    return { status: res.status.mock.calls[0][0], message: res.send.mock.calls[0][0].error.message };
  };

  it.each([
    ['User without needed role.', 401],
    ['Declined by user access rules.', 403],
    ['Strict access to register record not allowed.', 403],
  ])('string %s is sent as is', async (text, status) => {
    expect(await run(text, status)).toEqual({ status, message: text });
  });

  it('Only one draft allowed. keeps the "Error: " prefix and its status', async () => {
    const error: any = new Error('Only one draft allowed.');
    error.expose = true;
    expect(await run(error)).toEqual({ status: 500, message: 'Error: Only one draft allowed.' });
  });

  it('ForbiddenError text is unchanged', async () => {
    const message = (await run(new ForbiddenError('Key contains fields with allowTokens option.'))).message;
    expect(message).toBe('ForbiddenError: Key contains fields with allowTokens option.');
  });

  it('BadRequestError draft expired text is unchanged', async () => {
    expect((await run(new BadRequestError('Draft is already expired.'))).message).toBe('BadRequestError: Draft is already expired.');
  });
});
