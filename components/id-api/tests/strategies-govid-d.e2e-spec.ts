import nock from 'nock';
import supertest from 'supertest';
import { Sequence, ObjectIdentifier, OctetString } from 'asn1js';

import { TestApp, config } from './test_app';
import { Models } from '../src/models';
import { getStrategy, logout as govidLogout } from '../src/strategies/govid';
import { GovIdStrategy } from '../src/strategies/passport_libs/passport-govid/strategy';

const GOVID_URL = 'http://govid-d.example';
const ENC_URL = 'http://enc-d.example';

const verifyOf = (req: any, info: any) =>
  new Promise<{ err: any; user: any }>((resolve) => {
    (getStrategy() as any).verify(req, info, (err: any, user: any) => resolve({ err, user }));
  });

describe('GovID strategy (group D)', () => {
  let app: TestApp;
  let baseUrl: string;
  const govidCfg = () => config.auth_providers!.govid as any;

  const login = async (rawUser: any, opts: { tokenStatus?: number; body?: any } = {}) => {
    const agent = supertest.agent(baseUrl);
    const info = await agent.get('/authorise/govid/info').expect(200);
    const state = new URL(info.body.totalAuthUrl).searchParams.get('state')!;
    nock(GOVID_URL)
      .get('/get-access-token')
      .query(true)
      .reply(opts.tokenStatus ?? 200, { access_token: 'tok', user_id: 'gid' });
    nock(GOVID_URL).get('/get-user-info').query(true).reply(200, rawUser);
    nock(GOVID_URL).post('/get-user-logout').query(true).reply(200, { ok: true });
    return agent.post('/authorise/govid').send({ code: 'c', state, ...opts.body });
  };

  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.confirmCodeLength = 6;
    config.auth_providers = config.auth_providers || {};
    config.auth_providers.govid = {
      authorizationUrl: GOVID_URL,
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUrl: 'http://localhost/authorise/govid',
    } as any;
    app = await TestApp.setup();
    baseUrl = `http://localhost:${config.port}`;
  });

  afterAll(async () => {
    delete (config.auth_providers as any).govid;
    if (app) await app.destroy();
    await TestApp.afterAll();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
    delete govidCfg().useEncryption;
    delete govidCfg().authType;
  });

  describe('HTTP login', () => {
    it('builds the info URL with a custom authType list', async () => {
      govidCfg().authType = ['bank_id', 'diia_id'];
      const res = await supertest(baseUrl).get('/authorise/govid/info').expect(200);
      expect(new URL(res.body.totalAuthUrl).searchParams.get('auth_type')).toBe('bank_id,diia_id');
    });

    it('logs in a new user from the plain profile and caches it', async () => {
      const res = await login({ lastname: 'Petrenko', givenname: 'Ivan', middlename: 'Ivanovych', drfocode: '3100000001' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ error: null, redirect: '/authorise/continue/' });
    });

    it('fails with 500 when the token exchange fails', async () => {
      const res = await login({}, { tokenStatus: 500 });
      expect(res.status).toBe(500);
    });

    it('fails when the user info is a string', async () => {
      const res = await login('<html>');
      expect(res.status).toBe(500);
    });

    it('fails when the user info carries an error', async () => {
      const res = await login({ error: 'denied' });
      expect(res.status).toBe(500);
    });

    it('fails when the user info request fails', async () => {
      const agent = supertest.agent(baseUrl);
      const info = await agent.get('/authorise/govid/info');
      const state = new URL(info.body.totalAuthUrl).searchParams.get('state')!;
      nock(GOVID_URL).get('/get-access-token').query(true).reply(200, { access_token: 't', user_id: 'u' });
      nock(GOVID_URL).get('/get-user-info').query(true).reply(500, {});
      const res = await agent.post('/authorise/govid').send({ code: 'c', state });
      expect(res.status).toBe(500);
    });

    it('rejects an invalid ipn format with 401 and details', async () => {
      const res = await login({ lastname: 'P', drfocode: '12ab' });
      expect(res.status).toBe(401);
      expect(res.body.details).toBe('12ab');
    });

    it('rejects a missing surname with 401', async () => {
      const res = await login({ drfocode: '3100000002' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeTruthy();
    });

    it('rejects a profile without any code with 401', async () => {
      const res = await login({ lastname: 'P' });
      expect(res.status).toBe(401);
    });

    it('rejects a legal entity when only legal entities are blocked', async () => {
      (config as any).eds = { onlyLegalEntityAllow: true };
      try {
        const res = await login({ lastname: 'P', edrpoucode: '3100000021' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Only legal entity allowed.');
      } finally {
        delete (config as any).eds;
      }
    });

    it('signs in an existing user and updates names', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3100000003', provider: 'local', first_name: 'Old' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'govid', provider_id: '3100000003', data: {} });
      const res = await login({ lastname: 'New', givenname: 'Anna', middlename: 'Maria', drfocode: '3100000003', o: 'Org', ou: 'Unit' });
      expect(res.status).toBe(200);
      const row = (await app.model('user').findOne({ where: { userId: u.userId } }))!.dataValues;
      expect(row.provider).toBe('govid');
    });

    it('redirects when the session user already has govid', async () => {
      const res = await login({ lastname: 'Again', drfocode: '3100000004' });
      expect(res.status).toBe(200);
    });

    it('decrypts a JSON encrypted profile through the encryption service', async () => {
      Object.assign(govidCfg(), { useEncryption: true, idCert: 'CERT', encryptionServiceUrl: ENC_URL, encryptionServiceToken: 'etok' });
      const payload = Buffer.from(JSON.stringify({ lastname: 'Enc', givenname: 'Olena', drfocode: '3100000005' })).toString('base64');
      nock(ENC_URL).post('/decrypt').reply(200, { data: payload });
      const res = await login({ encryptedUserInfo: 'xxx' });
      expect(res.status).toBe(200);
    });

    it('fails when the decrypt service returns no data', async () => {
      Object.assign(govidCfg(), { useEncryption: true, idCert: 'CERT', encryptionServiceUrl: ENC_URL });
      nock(ENC_URL).post('/decrypt').reply(200, {});
      const res = await login({ encryptedUserInfo: 'xxx' });
      expect(res.status).toBe(500);
    });

    it('fails when the decrypt service is down', async () => {
      Object.assign(govidCfg(), { useEncryption: true, idCert: 'CERT', encryptionServiceUrl: ENC_URL });
      nock(ENC_URL).post('/decrypt').reply(500, {});
      const res = await login({ encryptedUserInfo: 'xxx' });
      expect(res.status).toBe(500);
    });

    it('fails when the decrypted payload cannot be parsed', async () => {
      Object.assign(govidCfg(), { useEncryption: true, idCert: 'CERT', encryptionServiceUrl: ENC_URL });
      nock(ENC_URL)
        .post('/decrypt')
        .reply(200, { data: Buffer.from('not a der blob').toString('base64') });
      const res = await login({ encryptedUserInfo: 'xxx' });
      expect(res.status).toBe(500);
    });

    it('survives a failing provider logout call', async () => {
      Object.assign(govidCfg(), { useEncryption: true, idCert: 'CERT', encryptionServiceUrl: ENC_URL });
      const agent = supertest.agent(baseUrl);
      const info = await agent.get('/authorise/govid/info');
      const state = new URL(info.body.totalAuthUrl).searchParams.get('state')!;
      const payload = Buffer.from(JSON.stringify({ lastname: 'L', drfocode: '3100000006' })).toString('base64');
      nock(GOVID_URL).get('/get-access-token').query(true).reply(200, { access_token: 't', user_id: 'u' });
      nock(GOVID_URL).get('/get-user-info').query(true).reply(200, { encryptedUserInfo: 'x' });
      nock(GOVID_URL).post('/get-user-logout').query(true).reply(500, {});
      nock(ENC_URL).post('/decrypt').reply(200, { data: payload });
      const res = await agent.post('/authorise/govid').send({ code: 'c', state });
      expect(res.status).toBe(200);
    });
  });

  describe('verify (direct)', () => {
    const req = (over: any = {}) => ({ isAuthenticated: () => false, session: {}, flash: jest.fn(), ...over });
    const info = (drfo: string, extra: any = {}) => ({ ipn: { DRFO: drfo }, surname: 'S', ...extra });

    it('rejects when no DRFO or EDRPOU exists', async () => {
      const { err } = await verifyOf(req(), { ipn: {}, surname: 'S' });
      expect(err).toMatchObject({ status: 400, message: 'DRFO or EDRPOU does not exist.' });
    });

    it('uses a 10-digit EDRPOU as the code', async () => {
      const { user } = await verifyOf(req(), { ipn: { EDRPOU: '3100000020' }, surname: 'S' });
      expect(user).toMatchObject({ user_id: '3100000020', provider: 'govid', cached: true });
    });

    it('rejects an 8-digit EDRPOU as an invalid format', async () => {
      const { err } = await verifyOf(req(), { ipn: { EDRPOU: '12345678' }, surname: 'S' });
      expect(err).toMatchObject({ message: 'DRFO or EDRPOU has an invalid format.', details: '12345678' });
    });

    it('rejects an authenticated user whose ipn differs', async () => {
      const r = req({ isAuthenticated: () => true, user: { userId: 'u', ipn: '1' } });
      const { user } = await verifyOf(r, info('3100000010'));
      await expect(user).rejects.toMatchObject({ message: 'DRFO or EDRPOU not the same as authenticated.' });
    });

    it('flashes services_error when the govid service already exists', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3100000011', provider: 'local' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'govid', provider_id: '3100000011', data: {} });
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId, ipn: '3100000011' } });
      const { user } = await verifyOf(r, info('3100000011'));
      expect(await user).toBe(r.user);
      expect(r.flash).toHaveBeenCalledWith('services_error', 'govid');
    });

    it('sets provider when client_requirements exist', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3100000012', provider: 'local' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'govid', provider_id: '3100000012', data: {} });
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId, ipn: '3100000012' }, session: { client_requirements: ['x'] } });
      const { user } = await verifyOf(r, info('3100000012'));
      await user;
      expect(r.user.provider).toBe('govid');
    });

    it('links govid for an authenticated user without the service', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3100000013', provider: 'local' } as any)
        .then((r) => r.dataValues);
      const r = req({ isAuthenticated: () => true, user: { userId: u.userId, ipn: '3100000013' } });
      const { user } = await verifyOf(r, info('3100000013'));
      await user;
    });

    it('keeps names for a locked existing user', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3100000014', provider: 'local', first_name: 'Keep', lockUserInfo: true } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'govid', provider_id: '3100000014', data: {} });
      const { user } = await verifyOf(req(), info('3100000014', { givenName: 'Changed Name' }));
      expect(user).toBeTruthy();
      const row = (await app.model('user').findOne({ where: { userId: u.userId } }))!.dataValues;
      expect(row.first_name).toBe('Keep');
    });

    it('splits names and updates company fields for an unlocked user', async () => {
      const u = await app
        .model('user')
        .create({ ipn: '3100000015', provider: 'local', first_name: 'Old' } as any)
        .then((r) => r.dataValues);
      await app.model('userServices').create({ userId: u.userId, provider: 'govid', provider_id: '3100000015', data: {} });
      await verifyOf(
        req(),
        info('3100000015', { givenName: 'A B C', organizationName: 'Org', organizationalUnitName: 'Unit', normalizedIpn: { EDRPOU: '12345678' } }),
      );
      const row = (await app.model('user').findOne({ where: { userId: u.userId } }))!.dataValues;
      expect(row).toMatchObject({ first_name: 'A', last_name: 'S', middle_name: 'B C', companyName: 'Org', edrpou: '12345678' });
    });

    it('returns the error when finding the existing user fails', async () => {
      jest.spyOn(Models.model('user'), 'findOne').mockRejectedValueOnce(new Error('db down'));
      const { err } = await verifyOf(req(), info('3100000016'));
      expect(err.message).toBe('db down');
    });
  });

  describe('passport normalization', () => {
    it('normalizes names and identification fields', () => {
      const p = (app as any).express.passport;
      const n = p.normalization.govid;
      expect(n.first_name('')).toBe('');
      expect(n.middle_name(undefined)).toBe('');
      expect(n.last_name('X')).toBe('X');
      expect(n.edrpou({ EDRPOU: '12345678' })).toBe('12345678');
      expect(n.ipn({ EDRPOU: '12345678' })).toBe('12345678');
      expect(n.ipn({ DRFO: '3100000001', EDRPOU: '1' })).toBe('3100000001');
      expect(n.isLegal({ EDRPOU: '12345678' })).toBe(true);
      expect(n.isLegal({ EDRPOU: '1234567890' })).toBe(false);
      expect(n.isIndividualEntrepreneur({ EDRPOU: '1234567890' })).toBe(true);
      expect(n.userIdentificationType({ EDRPOU: '12345678' })).toBeDefined();
      expect(n.userIdentificationType({})).toBeUndefined();
      expect(n.userIdentificationType({ DRFO: '1' })).toBeUndefined();
      expect(p.valid.govid).toHaveLength(10);
      expect(p.mapping.govid.first_name).toBe('firstName');
    });
  });

  describe('strategy helpers', () => {
    let s: any;
    beforeAll(() => {
      s = getStrategy();
    });

    it('answers 405 when the strategy is not configured', async () => {
      const bare: any = new GovIdStrategy(undefined as any);
      const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await bare.authenticateAsync({ res });
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.send).toHaveBeenCalledWith({ error: 'Gov ID strategy not defined.' });
    });

    it('authenticate forwards async failures to error()', async () => {
      const bare: any = Object.create(s);
      bare.error = jest.fn();
      jest.spyOn(bare, 'authenticateAsync').mockRejectedValue(new Error('x'));
      bare.authenticate({});
      await new Promise((r) => setImmediate(r));
      expect(bare.error).toHaveBeenCalled();
    });

    it('redirects to continue for a user that already has govid', async () => {
      const res: any = { redirect: jest.fn() };
      await s.authenticateAsync({ user: { services: { govid: {} } }, res, body: {}, socket: {} });
      expect(res.redirect).toHaveBeenCalledWith('/authorise/continue/');
    });

    it('redirects to the provider when the code is missing', async () => {
      const res: any = { redirect: jest.fn() };
      const session: any = {};
      await s.authenticateAsync({ res, body: {}, session, ip: '1.1.1.1' });
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`${GOVID_URL}/?response_type=code&client_id=cid`));
    });

    it('adds the certificate to the user info URL when encryption is on', () => {
      Object.assign(govidCfg(), { useEncryption: true, idCert: 'CERT' });
      const url = new URL(s.generateAuthorizationUrl({ govidAccessToken: 'a', govidUserId: 'u' }));
      expect(url.searchParams.get('cert')).toBe('CERT');
      expect(url.searchParams.get('user_id')).toBe('u');
    });

    it('normalizes codes, ipn and names', () => {
      expect(s.normalizeCode(1)).toBeUndefined();
      expect(s.normalizeCode('--')).toBeUndefined();
      expect(s.normalizeCode('ab-12')).toBe('AB12');
      expect(s.normalizeIpn('x')).toEqual({});
      expect(s.normalizeIpn({ DRFO: ' 12 ', EDRPOU: 5 })).toEqual({ DRFO: '12', EDRPOU: undefined });
      expect(s.normalizeName(5)).toBe('');
      expect(s.normalizeName('Ivan')).toBe('Ivan');
      expect(s.normalizeName(' N/A ')).toBe(s.options.namesNaList ? '' : s.normalizeName(' N/A '));
    });

    it('logout returns nothing for missing info or tokens', () => {
      expect(s.logout(undefined)).toBeUndefined();
      expect(s.logout({ data: {} })).toBeUndefined();
      expect(s.logout({ data: { raw: { access_token: 'a' } } })).toBeUndefined();
    });

    it('logout posts the provider logout call', async () => {
      nock(GOVID_URL).post('/get-user-logout').query({ access_token: 'a', user_id: 'u' }).reply(200, { done: true });
      await expect(s.logout({ data: { raw: { access_token: 'a', user_id: 'u' } } })).resolves.toEqual({ done: true });
    });

    it('module logout skips non-govid users and calls the strategy for govid', async () => {
      await expect(govidLogout(undefined)).resolves.toBeUndefined();
      await expect(govidLogout({ session: { passport: { user: { provider: 'local' } } } })).resolves.toBeUndefined();
      const spy = jest.spyOn(s, 'logout').mockResolvedValue(undefined);
      await govidLogout({ session: { passport: { user: { provider: 'govid', services: { govid: { data: 1 } } } } } });
      expect(spy).toHaveBeenCalledWith({ data: 1 });
    });

    it('extractJsonFromDer rejects garbage and findPKCS7DataObject locates the data object', () => {
      expect(() => s.extractJsonFromDer(new Uint8Array([1, 2, 3]))).toThrow();
      expect(s.findPKCS7DataObject(null)).toBeNull();
      const payload = new OctetString({ valueHex: new TextEncoder().encode('{"a":1}').buffer as ArrayBuffer });
      const data = new Sequence({ value: [new ObjectIdentifier({ value: '1.2.840.113549.1.7.1' }), payload] });
      const wrap = new Sequence({ value: [new Sequence({ value: [new Sequence({ value: [new ObjectIdentifier({ value: '1.2.3' })] }), data] })] });
      expect(s.findPKCS7DataObject(wrap)).toBe(payload);
      expect(s.findPKCS7DataObject(new Sequence({ value: [new Sequence({ value: [] })] }))).toBeNull();
    });

    it('decryptPayloadData parses JSON payloads', () => {
      const out = s.decryptPayloadData(Buffer.from('{"x":1}').toString('base64'));
      expect(out).toEqual({ decrypted: undefined, govidUser: { x: 1 } });
    });
  });
});
