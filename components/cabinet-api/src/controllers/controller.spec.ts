jest.mock('@liquio/back-core', () => ({ getTraceId: () => 'trace' }));

import Controller from './controller';

const makeRes = (): any => ({ status: jest.fn().mockReturnThis(), send: jest.fn() });

describe('Controller.responseError', () => {
  const controller = new Controller();

  it('hides raw error text and code of a non-public Error on 500', () => {
    const res = makeRes();
    const error = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:3000'), { code: 'ECONNREFUSED' });

    controller.responseError(res, error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: { message: 'Internal server error', details: undefined, code: undefined }, traceId: 'trace' });
  });

  it('gives a non-public Error on 401 only the status text', () => {
    const res = makeRes();

    controller.responseError(res, new Error('jwt malformed: secret detail'), 401);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send.mock.calls[0][0].error.message).toBe('Unauthorized');
  });

  it('keeps the message of an intentional (expose) 4xx Error', () => {
    const res = makeRes();

    controller.responseError(res, Object.assign(new Error('Bad input'), { status: 400, expose: true }), 400);

    expect(res.send.mock.calls[0][0].error.message).toBe('Bad input');
  });

  it('keeps trusted string messages and details', () => {
    const res = makeRes();

    controller.responseError(res, 'User without needed units.', 401, { needOneOfUnits: ['a'] });

    expect(res.send).toHaveBeenCalledWith({
      error: { message: 'User without needed units.', details: { needOneOfUnits: ['a'] }, code: undefined },
      traceId: 'trace',
    });
  });
});
