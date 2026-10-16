import AuthController, { parseAccessInfoHeader } from './auth';

const b64 = (v: unknown) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v), 'utf8').toString('base64');
const basic = `Basic ${Buffer.from('task:secret').toString('base64')}`;

const setup = (auth: any = {}, user = 'task') => {
  const controller: any = Object.create(AuthController.prototype);
  const token = `Basic ${Buffer.from(`${user}:secret`).toString('base64')}`;
  Object.assign(controller, {
    config: { auth: { tokens: [token, basic], trustedCallers: ['task'], ...auth } },
    log: { save: jest.fn() },
    responseError: jest.fn(),
  });
  const run = (accessInfo?: unknown) => {
    const req: any = {
      headers: { authorization: token, ...(accessInfo !== undefined && { 'access-info': accessInfo }) },
      method: 'GET',
      url: '/records',
      query: {},
      body: {},
    };
    const next = jest.fn();
    controller.basicAuth(req, {}, next);
    return { req, next };
  };
  return { controller, run };
};

describe('AuthController.basicAuth access-info', () => {
  it('honours a valid header from a trusted caller and records the asserting service', () => {
    const { run } = setup();
    const { req, next } = run(b64({ userId: 'u1', userName: 'Name' }));
    expect(next).toHaveBeenCalled();
    expect(req.accessInfo).toEqual({ userId: 'u1', userName: 'Name', assertedBy: 'task' });
  });

  it('cannot spoof assertedBy', () => {
    const { run } = setup();
    expect(run(b64({ userId: 'u1', assertedBy: 'admin' })).req.accessInfo.assertedBy).toBe('task');
  });

  it('ignores the header from an untrusted caller', () => {
    const { run, controller } = setup({}, 'other');
    const { req, next } = run(b64({ userId: 'victim', userName: 'Victim' }));
    expect(next).toHaveBeenCalled();
    expect(req.accessInfo).toBeUndefined();
    expect(controller.log.save).not.toHaveBeenCalledWith('access-info', expect.anything());
  });

  it('ignores the header when trustedCallers is not configured', () => {
    const { run } = setup({ trustedCallers: undefined });
    expect(run(b64({ userId: 'x' })).req.accessInfo).toBeUndefined();
  });

  it.each([
    ['not json', b64('not json')],
    ['array', b64([1])],
    ['string', b64('"x"')],
    ['oversize', b64({ a: 'x'.repeat(5000) })],
  ])('answers 400 for a malformed trusted header (%s)', (_name, header) => {
    const { run, controller } = setup();
    const { req, next } = run(header);
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith(expect.anything(), 'Invalid access-info header.', 400);
    expect(req.accessInfo).toBeUndefined();
  });

  it('answers 500 on malformed trustedCallers config', () => {
    const { run, controller } = setup({ trustedCallers: 'task' });
    const { next } = run(b64({ userId: 'x' }));
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith(expect.anything(), 'Server auth configuration error.', 500);
  });

  it('works without the header', () => {
    const { run } = setup();
    const { req, next } = run();
    expect(next).toHaveBeenCalled();
    expect(req.accessInfo).toBeUndefined();
  });
});

describe('parseAccessInfoHeader', () => {
  it('drops non-scalar, oversize and forbidden fields', () => {
    const header = b64('{"userId":"u","obj":{"a":1},"arr":[1],"long":"' + 'x'.repeat(600) + '","__proto__":{"p":1},"n":5,"b":true,"z":null}');
    const result = parseAccessInfoHeader(header);
    expect(result).toEqual({ userId: 'u', n: 5, b: true, z: null });
    expect(({} as any).p).toBeUndefined();
  });

  it('limits the number of keys', () => {
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(parseAccessInfoHeader(b64(many))!)).toHaveLength(20);
  });
});

describe('AuthController.basicAuth service permissions', () => {
  const call = (auth: any, route: { method: string; url: string; path?: string; query?: any }, user = 'task') => {
    const { controller } = setup(auth, user);
    const token = `Basic ${Buffer.from(`${user}:secret`).toString('base64')}`;
    const req: any = {
      headers: { authorization: token },
      method: route.method,
      url: route.url,
      route: { path: route.path ?? route.url.split('?')[0] },
      query: route.query || {},
      params: {},
      body: {},
    };
    const next = jest.fn();
    controller.basicAuth(req, {}, next);
    return { next, controller };
  };

  it('behaves as before for a user without an entry', () => {
    const { next } = call({ servicePermissions: { other: { routes: [] } } }, { method: 'DELETE', url: '/keys/1', path: '/keys/:id' });
    expect(next).toHaveBeenCalled();
  });

  it('allows a listed route', () => {
    const { next } = call(
      { servicePermissions: { task: { routes: ['GET /records'] } } },
      { method: 'GET', url: '/records?key_id=1', query: { key_id: '1' } },
    );
    expect(next).toHaveBeenCalled();
  });

  it('answers 403 for an unlisted route', () => {
    const { next, controller } = call(
      { servicePermissions: { task: { routes: ['GET /records'] } } },
      { method: 'DELETE', url: '/records/1', path: '/records/:id' },
    );
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith({}, expect.any(String), 403, { reason: 'route-not-allowed' });
  });

  it('answers 403 for a key outside the allowed keys', () => {
    const { next, controller } = call(
      { servicePermissions: { task: { routes: ['GET /records'], keys: [1] } } },
      { method: 'GET', url: '/records?key_id=2', query: { key_id: '2' } },
    );
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith({}, expect.any(String), 403, { reason: 'key-not-allowed' });
  });

  it('strict mode denies destructive routes to a non-trusted user without an entry', () => {
    const { next, controller } = call({ strict: true, trustedCallers: ['admin'] }, { method: 'POST', url: '/rollback/start' }, 'task');
    expect(next).not.toHaveBeenCalled();
    expect(controller.responseError).toHaveBeenCalledWith({}, expect.any(String), 403, { reason: 'destructive-route-requires-trusted-caller' });
  });

  it('strict mode is off by default', () => {
    expect(call({ trustedCallers: [] }, { method: 'POST', url: '/rollback/start' }).next).toHaveBeenCalled();
  });
});
