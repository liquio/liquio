import { Strategy as PassportStrategy } from 'passport-strategy';

import { Models } from '../models';
import { Services } from '../services';
import { maskIpn, x509, X509Strategy } from './x509';

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

describe('X509Strategy challenge enforcement', () => {
  let log: { save: jest.Mock };
  let eds: { checkRandomContentSign: jest.Mock };
  let x509Service: { getSignatureInfo: jest.Mock };
  let verifyMock: jest.Mock;

  const build = (options: any) => {
    const strategy = new X509Strategy(options, verifyMock as any);
    const s = strategy as any;
    s.fail = jest.fn();
    s.success = jest.fn();
    s.error = jest.fn();
    return s;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.requireMock('@liquio/back-core').Log.getInstance();
    eds = { checkRandomContentSign: jest.fn() };
    x509Service = { getSignatureInfo: jest.fn() };
    verifyMock = jest.fn();
    (Services.service as jest.Mock).mockImplementation((name: string) => (name === 'eds' ? eds : x509Service));
  });

  it('rejects a body without token by default and calls no service', async () => {
    const s = build({});
    await s.authenticate({ body: { pkcs7: 'x' } });
    expect(s.fail).toHaveBeenCalledWith({ message: 'Invalid signature or challenge' }, 401);
    expect(eds.checkRandomContentSign).not.toHaveBeenCalled();
    expect(x509Service.getSignatureInfo).not.toHaveBeenCalled();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('fails with 401 when the challenge check rejects', async () => {
    eds.checkRandomContentSign.mockRejectedValue(new Error('bad signature'));
    const s = build({ requireChallenge: true });
    await s.authenticate({ body: { pkcs7: 'x', token: 't' } });
    expect(s.fail).toHaveBeenCalledWith({ message: 'Invalid signature or challenge' }, 401);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('calls verify with the signer on a valid challenge signature', async () => {
    const signer = { serialNumber: '0000000001', commonName: 'Test Person' };
    eds.checkRandomContentSign.mockResolvedValue({ signer });
    const s = build({ requireChallenge: true });
    const req = { body: { pkcs7: 'x', token: 't' } };
    await s.authenticate(req);
    expect(verifyMock).toHaveBeenCalledWith(req, signer, expect.any(Function));
  });

  it('uses the legacy path when requireChallenge is false', async () => {
    const subject = { serialNumber: '0000000001' };
    x509Service.getSignatureInfo.mockResolvedValue({ subject });
    const s = build({ requireChallenge: false });
    const req = { body: { pkcs7: 'x' } };
    await s.authenticate(req);
    expect(x509Service.getSignatureInfo).toHaveBeenCalledWith('x');
    expect(verifyMock).toHaveBeenCalledWith(req, subject, expect.any(Function));
  });

  it('fails with 400 on the legacy path when getSignatureInfo rejects with status 400', async () => {
    x509Service.getSignatureInfo.mockRejectedValue({ status: 400 });
    const s = build({ requireChallenge: false });
    await s.authenticate({ body: { pkcs7: 'x' } });
    expect(s.fail).toHaveBeenCalledWith(expect.anything(), 400);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  describe('startup warnings', () => {
    const run = async (x509Config: any, redis: any) => {
      const app: any = {
        config: { auth_providers: { x509: x509Config }, redis },
        passport: { use: jest.fn(), authenticate: jest.fn(), valid: {}, mapping: {} },
        post: jest.fn(),
      };
      await x509(app);
      return log.save.mock.calls.filter((c) => c[2] === 'warn').map((c) => c[1].warning as string);
    };

    it('warns when requireChallenge is false', async () => {
      const warnings = await run({ isEnabled: true, requireChallenge: false }, { isEnabled: true });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('requireChallenge is false');
    });

    it('warns when redis is disabled', async () => {
      const warnings = await run({ isEnabled: true }, { isEnabled: false });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('redis is disabled');
    });

    it('logs no warnings by default with redis enabled', async () => {
      expect(await run({ isEnabled: true }, { isEnabled: true })).toEqual([]);
    });
  });
});
