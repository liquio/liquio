import fs from 'fs';
import os from 'os';
import path from 'path';

import nodeRSA from 'node-rsa';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';
import { Models } from '../src/models';
import { eds } from '../src/strategies/eds';
import { bankid } from '../src/strategies/bankid';

const run = (strategy: any, req: any, ...args: any[]) =>
  new Promise<{ err: any; user: any }>((resolve) => {
    strategy.verify(req, ...args, (err: any, user: any) => resolve({ err, user }));
  });

describe('EDS and BankID strategies (group D)', () => {
  let app: TestApp;
  let tmpDir: string;

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.confirmCodeLength = 6;
    app = await TestApp.setup();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bankid-d-'));
  });

  afterAll(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete (config.auth_providers as any)?.eds;
    delete (config.auth_providers as any)?.bankid;
    if (app) await app.destroy();
    await TestApp.afterAll();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('eds', () => {
    let post: jest.SpyInstance;
    let strategy: any;

    const req = (over: any = {}) => ({
      isAuthenticated: () => false,
      user: undefined,
      session: {},
      flash: jest.fn(),
      ...over,
    });

    beforeAll(async () => {
      post = jest.spyOn((app as any).express, 'post').mockImplementation((() => undefined) as any);
      (config.auth_providers as any).eds = { isEnabled: true };
      await eds((app as any).express);
      strategy = (app as any).express.passport._strategy('eds');
    });

    it('does nothing when the provider is disabled', async () => {
      const before = (app as any).express.passport._strategy('eds');
      (config.auth_providers as any).eds = { isEnabled: false };
      await eds((app as any).express);
      (config.auth_providers as any).eds = { isEnabled: true };
      expect((app as any).express.passport._strategy('eds')).toBe(before);
    });

    it('registers mapping, normalization, valid list and the POST route', () => {
      const p = (app as any).express.passport;
      expect(p.mapping.eds.first_name).toBe('givenName');
      expect(p.valid.eds).toHaveLength(10);
      expect(post).toHaveBeenCalledWith('/authorise/eds', expect.anything(), expect.any(Function));
      expect(strategy.name).toBe('eds');
    });

    it('POST handler logs, saves the session and sends the continue redirect', async () => {
      const handler = post.mock.calls.find((c) => c[0] === '/authorise/eds')![2];
      const save = jest.fn((cb: any) => cb());
      const res: any = { headersSent: false, send: jest.fn() };
      const u = await app
        .model('user')
        .create({ ipn: '2000000010', provider: 'eds' } as any)
        .then((r) => r.dataValues);
      await handler({ session: { save, passport: { user: { userId: u.userId } } } }, res);
      await expect(handler({ session: { save, passport: { user: { userId: '00000000-0000-4000-8000-000000000000' } } } }, res)).rejects.toThrow(
        'Authorization has been revoked',
      );
      expect(res.send).toHaveBeenCalledWith({ error: null, redirect: '/authorise/continue/' });
      const sent: any = { headersSent: true, send: jest.fn() };
      await handler({ session: { save, passport: { user: { id: 'u8' } } } }, sent);
      expect(sent.send).not.toHaveBeenCalled();
    });

    it('normalizes names and ipn values', () => {
      const n = (app as any).express.passport.normalization.eds;
      expect(n.first_name('')).toBe('');
      expect(n.first_name('Ivan Petrovych')).toBe('Ivan');
      expect(n.first_name('A B C')).toBe('A B C');
      expect(n.middle_name('')).toBe('');
      expect(n.middle_name('Ivan Petrovych')).toBe('Petrovych');
      expect(n.middle_name('A B C')).toBe('');
      expect(n.edrpou({ EDRPOU: '12345678' })).toBe('12345678');
      expect(n.ipn({ DRFO: '1234567890', EDRPOU: '12345678' })).toBe('1234567890');
      expect(n.ipn({ EDRPOU: '12345678' })).toBe('12345678');
      expect(n.isLegal({ EDRPOU: '12345678' })).toBe(true);
      expect(n.isIndividualEntrepreneur({ EDRPOU: '1234567890' })).toBe(true);
      expect(typeof n.userIdentificationType({ DRFO: '1234567890' })).toBe('string');
    });

    it('rejects a missing ipn with 400 and surname details', async () => {
      await expect(strategy.verify(req(), { ipn: {}, surname: 'Sur' }, jest.fn())).rejects.toMatchObject({
        status: 400,
        message: 'Ipn does not exist.',
        details: 'Sur',
      });
    });

    it('rejects an invalid ipn format', async () => {
      await expect(strategy.verify(req(), { ipn: { DRFO: '12ab' }, surname: 'Sur' }, jest.fn())).rejects.toMatchObject({
        message: 'Ipn has an invalid format.',
        details: '12ab',
      });
    });

    it('rejects a missing surname', async () => {
      await expect(strategy.verify(req(), { ipn: { DRFO: '1234567890' } }, jest.fn())).rejects.toMatchObject({
        message: 'Surname does not exist.',
        details: '1234567890',
      });
    });

    it('rejects a signer without ipn object (TypeError)', async () => {
      await expect(strategy.verify(req(), {}, jest.fn())).rejects.toBeInstanceOf(TypeError);
    });

    it('caches a new user when none exists', async () => {
      const signer = { ipn: { DRFO: '2000000001' }, surname: 'New', givenName: 'Nina' };
      const { user } = await run(strategy, req(), signer);
      expect(user).toMatchObject({ user_id: '2000000001', cached: true, provider: 'eds', services: { eds: signer } });
      expect(Models.cache.get('2000000001')).toBeTruthy();
    });

    it('accepts a passport-style ipn', async () => {
      const { user } = await run(strategy, req(), { ipn: { DRFO: 'АБ123456' }, surname: 'P' });
      expect(user.user_id).toBe('АБ123456');
    });

    it('updates an existing user found by service and keeps names when locked', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '2000000002', provider: 'local', first_name: 'Old', last_name: 'Name', lockUserInfo: true } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'eds', provider_id: '2000000002', data: {} });
      const signer = { ipn: { DRFO: '2000000002' }, surname: 'Changed', givenName: 'Zed' };
      const { user } = await run(strategy, req(), signer);
      expect(user).toBeTruthy();
      const row = await app.model('user').findOne({ where: { userId: u.userId } });
      expect(row!.dataValues.provider).toBe('eds');
      expect(row!.dataValues.first_name).toBe('Old');
    });

    it('updates names for an existing unlocked user', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '2000000003', provider: 'local', first_name: 'Old', last_name: 'Name' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'eds', provider_id: '2000000003', data: {} });
      const signer = {
        ipn: { DRFO: '2000000003', EDRPOU: '12345678' },
        surname: 'Smith',
        givenName: 'John Paul Ringo',
        organizationName: 'Org',
        organizationalUnitName: 'Unit',
        normalizedIpn: { DRFO: '2000000003', EDRPOU: '12345678' },
      };
      await run(strategy, req(), signer);
      const row = (await app.model('user').findOne({ where: { userId: u.userId } }))!.dataValues;
      expect(row).toMatchObject({
        first_name: 'John',
        last_name: 'Smith',
        middle_name: 'Paul Ringo',
        companyName: 'Org',
        companyUnit: 'Unit',
        edrpou: '12345678',
        isLegal: true,
      });
    });

    it('rejects an authenticated user with a different code', async () => {
      const r = req({ isAuthenticated: () => true, user: { userId: 'u1', ipn: '1111111111', edrpou: '' } });
      const { user } = await run(strategy, r, { ipn: { DRFO: '2000000004' }, surname: 'S' });
      await expect(user).rejects.toMatchObject({ message: 'DRFO or EDRPOU not the same as authenticated.' });
    });

    it('flashes services_error for an authenticated user with an existing eds service', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '2000000005', provider: 'local' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'eds', provider_id: '2000000005', data: {} });
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId, ipn: '2000000005' } });
      const { user } = await run(strategy, r, { ipn: { DRFO: '2000000005' }, surname: 'S' });
      expect(await user).toBe(r.user);
      expect(r.flash).toHaveBeenCalledWith('services_error', 'eds');
    });

    it('marks provider for an authenticated user when client_requirements are set', async () => {
      const r = req({
        isAuthenticated: () => true,
        user: { userId: 'x', ipn: '2000000005' },
        session: { client_requirements: ['eds'] },
      });
      const { user } = await run(strategy, r, { ipn: { DRFO: '2000000005' }, surname: 'S' });
      await user;
      expect(r.user.provider).toBe('eds');
    });

    it('links a new eds service for an authenticated user without one', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '2000000006', provider: 'local' } as any)
        .then((r) => r.dataValues);
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId, ipn: '2000000006' } });
      const { user } = await run(strategy, r, { ipn: { DRFO: '2000000006' }, surname: 'S' });
      await user;
    });

    describe('strategy authenticate', () => {
      const mk = (body: any, user?: any) => {
        const res: any = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
        const s: any = Object.create(strategy);
        s.success = jest.fn();
        const r: any = { body, user, res, isAuthenticated: () => false, session: {}, flash: jest.fn() };
        return { s, r, res };
      };
      const flush = () => new Promise((r) => setTimeout(r, 20));

      it('redirects when already signed with eds', async () => {
        const { s, r, res } = mk({}, { services: { eds: {} } });
        await s.authenticateAsync(r, {});
        expect(res.redirect).toHaveBeenCalledWith('/authorise/continue/');
      });

      it('redirects home without signature', async () => {
        const { s, r, res } = mk({});
        await s.authenticateAsync(r, {});
        expect(res.redirect).toHaveBeenCalledWith('/');
      });

      it('responds 500 when sign check throws', async () => {
        jest.spyOn(Services.service('eds'), 'checkRandomContentSign').mockRejectedValue(new Error('bad sign'));
        const { s, r, res } = mk({ signature: 's', token: 't' });
        await s.authenticateAsync(r, {});
        expect(res.status).toHaveBeenCalledWith(500);
      });

      it('responds 500 when signer is missing', async () => {
        jest.spyOn(Services.service('eds'), 'checkRandomContentSign').mockResolvedValue({} as any);
        const { s, r, res } = mk({ signature: 's', token: 't' });
        await s.authenticateAsync(r, {});
        expect(res.send).toHaveBeenCalledWith({ error: 'Signer not defined' });
      });

      it('verifies the signer and calls success', async () => {
        jest.spyOn(Services.service('eds'), 'checkRandomContentSign').mockResolvedValue({
          signer: { ipn: { DRFO: '2000000099' }, surname: 'Sig' },
          issuer: { cn: 'ca' },
          pem: 'pem',
        } as any);
        const { s, r } = mk({ signature: 's', token: 't', encodeCertSerial: 'sn', encodeCert: 'c' });
        await s.authenticateAsync(r, {});
        await flush();
        expect(s.success).toHaveBeenCalledWith(expect.objectContaining({ user_id: '2000000099' }), null);
      });

      it('responds 500 when verify throws synchronously', async () => {
        jest.spyOn(Services.service('eds'), 'checkRandomContentSign').mockResolvedValue({ signer: { x: 1 } } as any);
        const { s, r, res } = mk({ signature: 's', token: 't' });
        s.verify = () => {
          throw new Error('boom');
        };
        await s.authenticateAsync(r, {});
        expect(res.status).toHaveBeenCalledWith(500);
      });

      it('authenticate delegates to authenticateAsync', () => {
        const { s, r } = mk({});
        const spy = jest.spyOn(s, 'authenticateAsync').mockResolvedValue(undefined);
        s.authenticate(r, {});
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('bankid', () => {
    let key: nodeRSA;
    let strategy: any;
    const enc = (v: string) => key.encrypt(v, 'base64');
    const profile = (id: string) => ({ clId: enc(id), firstName: enc('Ann'), sex: enc('F'), birthDay: enc('01.02.1990'), type: 'x' });
    const req = (over: any = {}) => ({ isAuthenticated: () => false, session: {}, flash: jest.fn(), ...over });

    beforeAll(async () => {
      key = new nodeRSA({ b: 512 });
      key.setOptions({ encryptionScheme: 'pkcs1' });
      const keyPath = path.join(tmpDir, 'key.pem');
      fs.writeFileSync(keyPath, key.exportKey('pkcs1-private-pem'));
      (config.auth_providers as any).bankid = {
        privateKey: keyPath,
        clientId: 'c',
        clientSecret: 's',
        authorizationUrl: 'http://bankid.example',
        redirectUrl: 'http://localhost/cb',
      };
      await bankid((app as any).express);
      strategy = (app as any).express.passport._strategy('bankid');
    });

    it('throws when not configured or key file missing', async () => {
      const saved = (config.auth_providers as any).bankid;
      delete (config.auth_providers as any).bankid;
      await expect(bankid((app as any).express)).rejects.toThrow("'bankid' provider is not configured");
      (config.auth_providers as any).bankid = { ...saved, privateKey: path.join(tmpDir, 'missing.pem') };
      await expect(bankid((app as any).express)).rejects.toThrow('Private key file not found');
      (config.auth_providers as any).bankid = saved;
    });

    it('registers mapping, normalization and valid fields', () => {
      const p = (app as any).express.passport;
      expect(p.mapping.bankid.gender).toBe('sex');
      expect(p.valid.bankid).toEqual(['last_name', 'first_name', 'middle_name', 'gender', 'birthday']);
      expect(p.normalization.bankid.gender('M')).toBe('male');
      expect(p.normalization.bankid.gender('F')).toBe('female');
      expect(p.normalization.bankid.gender('X')).toBe('');
      expect(p.normalization.bankid.birthday('01.02.1990')).toBe('01/02/1990');
      expect(p.normalization.bankid.birthday('')).toBe('');
    });

    it('caches an unknown unauthenticated user', async () => {
      const { user } = await run(strategy, req(), 'at', 'rt', profile('bid-new'));
      expect(user).toMatchObject({ user_id: 'bid-new', cached: true, provider: 'bankid' });
      expect(user.services.bankid.firstName).toBe('Ann');
    });

    it('signs in an existing user linked to bankid', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3000000001', provider: 'local' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'bankid', provider_id: 'bid-known', data: {} });
      const { user } = await run(strategy, req(), 'at', 'rt', profile('bid-known'));
      expect(user.userId).toBe(u.userId);
      const row = (await app.model('user').findOne({ where: { userId: u.userId } }))!.dataValues;
      expect(row.provider).toBe('bankid');
    });

    it('links bankid to an authenticated user', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3000000002', provider: 'local' } as any)
        .then((r) => r.dataValues);
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId } });
      const { user } = await run(strategy, r, 'at', 'rt', profile('bid-link'));
      expect(user.userId).toBe(u.userId);
    });

    it('flashes services_error when the bankid service already exists', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3000000003', provider: 'local' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'bankid', provider_id: 'bid-dup', data: {} });
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId } });
      const { user } = await run(strategy, r, 'at', 'rt', profile('bid-dup'));
      expect(user).toBe(r.user);
      expect(r.flash).toHaveBeenCalledWith('services_error', 'bankid');
    });

    it('sets provider when client_requirements exist', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3000000004', provider: 'local' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'bankid', provider_id: 'bid-req', data: {} });
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId }, session: { client_requirements: ['bankid'] } });
      const { user } = await run(strategy, r, 'at', 'rt', profile('bid-req'));
      expect(user.provider).toBe('bankid');
    });
  });
});
