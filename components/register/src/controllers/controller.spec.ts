import Controller from './controller';
import { PublicError } from '../lib/public_error';

jest.mock('@liquio/back-core', () => ({ getTraceId: () => 'trace', Log: { getInstance: () => ({ save: jest.fn() }) } }));

describe('Controller.responseError disclosure', () => {
  const run = (error: any, status?: number, details?: any) => {
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const controller: any = new Controller({ sign: {} });
    const save = jest.fn();
    controller.log = { save };
    controller.responseError(res, error, status, details);
    return { res, body: res.send.mock.calls[0][0], save };
  };

  it('hides the text and code of a non-public Error on 500 but logs it', () => {
    const error = Object.assign(new Error('SequelizeDatabaseError: SELECT * FROM users'), { code: '42P01' });
    const { res, body, save } = run(error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.error.message).toBe('Internal server error');
    expect(body.error.code).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/Sequelize|SELECT|42P01/);
    expect(save).toHaveBeenCalledWith('response-error-hidden', expect.objectContaining({ message: error.message, traceId: 'trace' }));
  });

  it('gives a non-public Error the status text on 4xx', () => {
    expect(run(new Error('Verify signature error. secret'), 400).body.error.message).toBe('Bad Request');
  });

  it('keeps public errors, their code, and plain strings', () => {
    const body = run(Object.assign(new PublicError('Key 1 signature required.'), { code: 'DB_CONSTRAINT_ERROR' }), 400).body;
    expect(body.error).toEqual({ message: 'Key 1 signature required.', details: undefined, code: 'DB_CONSTRAINT_ERROR' });
    expect(run('Record is not writable.', 403).body.error.message).toBe('Record is not writable.');
  });
});
