import { Strategy as PassportStrategy } from 'passport-strategy';

import { Models } from '../models';
import { Services } from '../services';
import { maskIpn, x509 } from './x509';

jest.mock('../middleware/session', () => ({ saveSession: jest.fn() }));
jest.mock('../lib/login_history_extractor', () => ({ prepareLoginHistoryData: jest.fn() }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance } };
});

const IPN = '1234567890';

describe('x509 strategy logging', () => {
  let verify: (req: any, userInfo: any, done: jest.Mock) => Promise<void>;
  let log: { save: jest.Mock };
  let postHandler: (req: any, res: any) => Promise<void>;

  beforeEach(async () => {
    jest.clearAllMocks();
    log = jest.requireMock('@liquio/back-core').Log.getInstance();
    (Services.service as jest.Mock).mockReturnValue({ getUser: jest.fn().mockResolvedValue(null) });
    (Models.model as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ dataValues: { userId: 'u1', first_name: 'A', last_name: 'B' } }),
      update: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
    });
    const app: any = {
      config: { auth_providers: { x509: { isEnabled: true } } },
      passport: { use: jest.fn(), authenticate: jest.fn(() => (_q: any, _s: any, n: any) => n()), valid: {}, mapping: {} },
      post: jest.fn(),
    };
    await x509(app);
    const strategy = app.passport.use.mock.calls[0][1] as PassportStrategy & { verify: typeof verify };
    verify = (strategy as any).verify;
    postHandler = app.post.mock.calls[0][2];
  });

  it('maskIpn keeps only the last two characters', () => {
    expect(maskIpn(IPN)).toBe('***90');
    expect(maskIpn(undefined)).toBeUndefined();
  });

  it('does not log the IPN or names from the certificate subject', async () => {
    const done = jest.fn();
    await verify({}, { serialNumber: IPN, givenName: 'Ivan', surname: 'Petrenko', commonName: 'Ivan Petrenko' }, done);

    const logged = JSON.stringify(log.save.mock.calls);
    expect(logged).not.toContain(IPN);
    expect(logged).not.toContain('Ivan');
    expect(logged).not.toContain('Petrenko');
    expect(log.save).toHaveBeenCalledWith('x509-strategy|authenticate|verify', { ipn: '***90' }, 'info');
    expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ userId: 'u1' }));
  });

  it('logs only field names when the certificate has no user id', async () => {
    const done = jest.fn();
    await verify({}, { givenName: 'Ivan', surname: 'Petrenko' }, done);

    const logged = JSON.stringify(log.save.mock.calls);
    expect(logged).not.toContain('Ivan');
    expect(logged).not.toContain('Petrenko');
    expect(log.save).toHaveBeenCalledWith('x509-strategy|authenticate|no-user-id', { fields: ['givenName', 'surname'] }, 'error');
  });

  it('logs only the userId on successful authorisation', async () => {
    const req: any = { user: { userId: 'u1', first_name: 'Ivan', ipn: IPN } };
    const res: any = { send: jest.fn(), status: jest.fn().mockReturnThis() };
    await postHandler(req, res);

    const logged = JSON.stringify(log.save.mock.calls);
    expect(logged).not.toContain(IPN);
    expect(logged).not.toContain('Ivan');
    expect(log.save).toHaveBeenCalledWith('x509-strategy|authorise|success', { userId: 'u1' }, 'info');
  });
});
