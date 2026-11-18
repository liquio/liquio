import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import nodeRSA from 'node-rsa';

import { TestApp, config } from './test_app';
import { bankid } from '../src/strategies/bankid';

const run = (strategy: any, req: any, ...args: any[]) =>
  new Promise<{ err: any; user: any }>((resolve) => {
    strategy.verify(req, ...args, (err: any, user: any) => resolve({ err, user }));
  });

describe('BankID strategy (group D)', () => {
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
    delete (config.auth_providers as any)?.bankid;
    if (app) await app.destroy();
    await TestApp.afterAll();
  });

  afterEach(() => jest.restoreAllMocks());

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
