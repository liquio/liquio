import { AuthService } from './auth.service';
import { Models } from '../models';

jest.mock('./base_service', () => ({
  BaseService: class {
    config: any;
    log = { save: jest.fn() };
    constructor(config: any) {
      this.config = config;
    }
  },
}));
jest.mock('../models', () => ({ Models: { model: jest.fn(), db: { literal: jest.fn((value) => value) } } }));
jest.mock('../middleware/session', () => ({ saveSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: jest.fn() }) } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));

const callback = 'https://cabinet.example/callback/';
const challenge = 'a'.repeat(43);

describe('AuthService PKCE session binding', () => {
  let service: AuthService;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    service = new AuthService({ oauth: { defaults: { redirect_uri: [callback] } } } as any, {} as any, {} as any);
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
    (Models.model as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        dataValues: {
          id: 'cabinet',
          clientId: 'cabinet',
          redirectUri: [callback],
          requirements: [],
          scope: [],
        },
      }),
    });
  });

  async function prepare(params: any = {}, session: any = {}) {
    const req: any = { query: { client_id: 'cabinet', redirect_uri: callback, state: 'state', ...params }, session };
    const middleware = service.prepareClient();
    for (const validator of middleware.slice(0, -1) as any[]) await validator.run(req);
    await (middleware[middleware.length - 1] as any)(req, res, next);
    return req;
  }

  it('carries S256 bindings through the session into the authorization request', async () => {
    const req = await prepare({ code_challenge: challenge, code_challenge_method: 'S256' });
    expect(next).toHaveBeenCalled();
    expect(req.session).toMatchObject({ code_challenge: challenge, code_challenge_method: 'S256' });
    req.query = { code_challenge: 'attacker', code_challenge_method: 'plain' };
    req.body = {};
    (service.readyClient()[1] as any)(req, res, next);
    expect(req.body).toMatchObject({ code_challenge: challenge, code_challenge_method: 'S256', redirect_uri: callback });
  });

  it('clears PKCE left by a previous authorization when starting without it', async () => {
    const req = await prepare({}, { code_challenge: challenge, code_challenge_method: 'S256' });
    expect(next).toHaveBeenCalled();
    expect(req.session.code_challenge).toBeUndefined();
    expect(req.session.code_challenge_method).toBeUndefined();
  });

  it.each([
    { code_challenge: challenge },
    { code_challenge_method: 'S256' },
    { code_challenge: challenge, code_challenge_method: 'plain' },
    { code_challenge: 'short', code_challenge_method: 'S256' },
    { code_challenge: ['a', 'b'], code_challenge_method: 'S256' },
  ])('rejects malformed PKCE before storing a session: %p', async (params) => {
    const req = await prepare(params);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(req.session.redirect_uri).toBeUndefined();
  });

  it('binds custom codes to the first configured default callback', async () => {
    const save = jest.spyOn(service.oAuthModel, 'saveAuthorizationCode').mockResolvedValue({} as any);
    await service.generateCustomAuthorizationCode({ id: 'user' }, 'cabinet', []);
    expect(save.mock.calls[0][0].redirectUri).toBe(callback);
  });
});
