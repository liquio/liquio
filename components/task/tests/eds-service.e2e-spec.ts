import crypto from 'node:crypto';

import nock from 'nock';

import { TestApp } from './test-app';
import { Pkcs7EdsProvider } from '../src/lib/eds/providers/pkcs7';
import { Eds } from '../src/lib/eds';
import { Encryptor } from '../src/lib/encryptor';
import { RemoteStaticCache } from '../src/services/remote_static_cache';
import { getBusinesses, getConfig } from '../src/lib/context';

const SIGN_TOOL = 'http://sign-tool-eds:8080';
const FAKE_P7S = `MII${'B'.repeat(200)}`;

// PKCS7 EDS provider against a mocked sign tool, the AES encryptor and the remote static cache against the test Redis.
describe('EDS, encryptor and static cache services', () => {
  let app: TestApp;
  let provider: any;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
    provider = new Pkcs7EdsProvider({ signToolUrl: SIGN_TOOL, timeout: 2000 });
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  beforeEach(async () => {
    nock.cleanAll();
    await TestApp.beforeEach();
  });

  const signatureInfo = (subject: any, extra: any = {}) => ({ subject, issuer: { cn: 'ca' }, serial: '1', signTime: 1, pem: 'fake-pem', ...extra });

  describe('PKCS7 provider', () => {
    it('reads the signer IPN from several certificate subject fields', async () => {
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890-12345678' }));
      const bySerial = await provider.getSignatureInfo(FAKE_P7S);
      expect(bySerial.signer.ipn).toEqual({ DRFO: '1234567890', EDRPOU: '12345678' });

      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ personIdentifier: '1111111111-87654321' }));
      expect((await provider.getSignatureInfo(FAKE_P7S)).signer.ipn).toEqual({ DRFO: '1111111111', EDRPOU: '87654321' });

      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ commonName: 'Name 2222222222', organizationIdentifier: '99999999' }));
      expect((await provider.getSignatureInfo(FAKE_P7S)).signer.ipn).toEqual({ DRFO: '2222222222', EDRPOU: '99999999' });

      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ commonName: 'No ipn' }));
      expect((await provider.getSignatureInfo(FAKE_P7S)).signer.ipn.DRFO).toBeNull();

      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: ' ' }));
      expect((await provider.getSignatureInfo(FAKE_P7S)).signer.ipn.DRFO).toBeNull();
    });

    it('uses the expected content or the content of the signature', async () => {
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890' }, { content: Buffer.from('inner').toString('base64') }));
      expect((await provider.getSignatureInfo(FAKE_P7S)).content.toString()).toBe('inner');
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect((await provider.getSignatureInfo(FAKE_P7S, 'expected')).content.toString()).toBe('expected');
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect((await provider.getSignatureInfo(FAKE_P7S, undefined, false, Buffer.from('given'))).content.toString()).toBe('given');
    });

    it('returns null for signatures that cannot be processed', async () => {
      expect(await provider.getSignatureInfo(undefined)).toBeNull();
      expect(await provider.getSignatureInfo('short')).toBeNull();
      nock(SIGN_TOOL).post('/x509/signature-info').reply(400, { message: 'Invalid signature data' });
      expect(await provider.getSignatureInfo(FAKE_P7S)).toBeNull();
      nock(SIGN_TOOL).post('/x509/signature-info').reply(200, '');
      expect(await provider.getSignatureInfo(FAKE_P7S)).toBeNull();
      nock(SIGN_TOOL).post('/x509/signature-info').reply(500, {});
      expect(await provider.getSignatureInfo(FAKE_P7S)).toBeNull();
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect(await provider.getSignatureInfo(`XX${'C'.repeat(200)}`)).toBeTruthy();
    });

    it('checks that the signed content and the certificate match', async () => {
      const reply = () =>
        nock(SIGN_TOOL)
          .post('/x509/signature-info')
          .reply(200, signatureInfo({ serialNumber: '1234567890' }, { pem: 'cert' }));
      reply();
      expect(await provider.check('content', FAKE_P7S)).toBe(true);
      reply();
      expect(await provider.check('content', FAKE_P7S, 'cert')).toBe(true);
      reply();
      expect(await provider.check('content', FAKE_P7S, 'other-cert')).toBe(false);
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890' }, { content: Buffer.from('different').toString('base64') }));
      expect(await provider.check('content', FAKE_P7S)).toBe(true);
      nock(SIGN_TOOL).post('/x509/signature-info').reply(400, { message: 'Invalid signature data' });
      expect(await provider.check('content', FAKE_P7S)).toBe(false);
    });

    it('verifies signatures and answers the simple helpers', async () => {
      nock(SIGN_TOOL)
        .post('/x509/signature-info')
        .reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect(await provider.verifySign(FAKE_P7S)).toBe(true);
      nock(SIGN_TOOL).post('/x509/signature-info').reply(400, { message: 'Invalid signature data' });
      expect(await provider.verifySign(FAKE_P7S)).toBe(false);
      expect(await provider.getSignersRNOKPP('x')).toEqual([]);
      expect(await provider.sendPingRequest()).toEqual({});
      expect(Pkcs7EdsProvider.name).toBeTruthy();
    });

    it('hashes data with the sign tool and falls back to a local hash', async () => {
      nock(SIGN_TOOL).post('/x509/hash-data').reply(200, 'tool-hash');
      expect(await provider.hashData(Buffer.from('data'))).toBe('tool-hash');
      nock(SIGN_TOOL).post('/x509/hash-data').reply(200, Buffer.from('raw').toString('base64'));
      expect((await provider.hashData(Buffer.from('data'), false)).toString()).toBe('raw');
      nock(SIGN_TOOL).post('/x509/hash-data').reply(200, '');
      expect(await provider.hashData(Buffer.from('data'))).toBe(crypto.createHash('sha256').update(Buffer.from('data')).digest('base64'));
      nock(SIGN_TOOL).post('/x509/hash-data').reply(200, '');
      expect(Buffer.isBuffer(await provider.hashData(Buffer.from('data'), false))).toBe(true);
    });

    it('converts a signed hash to an internal signature', async () => {
      nock(SIGN_TOOL).post('/x509/hash-to-internal-signature').reply(200, 'internal');
      expect(await provider.hashToInternalSignature('signed', 'content')).toBe('internal');
      nock(SIGN_TOOL).post('/x509/hash-to-internal-signature').reply(200, '');
      expect(await provider.hashToInternalSignature('signed', 'content')).toBe('signed');
    });

    it('verifies a hash through the sign tool', async () => {
      nock(SIGN_TOOL).post('/x509/verify-hash').reply(200, { result: true });
      expect((await provider.verifyHash('h', 's')).isValid).toBe(true);
      nock(SIGN_TOOL).post('/x509/verify-hash').reply(200, { result: false });
      expect((await provider.verifyHash('h', 's')).isValid).toBe(false);
      nock(SIGN_TOOL).post('/x509/verify-hash').reply(200, {});
      expect((await provider.verifyHash('h', 's')).message).toContain('No response');
      nock(SIGN_TOOL).post('/x509/verify-hash').reply(500, {});
      expect((await provider.verifyHash('h', 's')).isValid).toBe(false);
    });

    it('is wrapped by the EDS facade of the application', async () => {
      const eds = getBusinesses().document.eds;
      const appSignTool = nock('http://sign-tool:8080');
      appSignTool.post('/x509/signature-info').reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect((await eds.getSignatureInfo(FAKE_P7S)).signer.ipn.DRFO).toBe('1234567890');
      appSignTool.post('/x509/signature-info').reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect(await eds.verifySign(FAKE_P7S)).toBe(true);
      expect(await eds.getSignersRNOKPP('x')).toEqual([]);
      expect(await eds.sendPingRequest()).toEqual({});
      appSignTool.post('/x509/signature-info').reply(200, signatureInfo({ serialNumber: '1234567890' }));
      expect(await eds.check('c', FAKE_P7S)).toBe(true);
      expect(Eds).toBeTruthy();
    });
  });

  describe('Encryptor', () => {
    const key = crypto.randomBytes(32).toString('base64');

    it('round-trips data and rejects tampered data', () => {
      const encryptor = new Encryptor({ key });
      const packed = encryptor.encrypt('secret value');
      expect(packed.split(':')).toHaveLength(3);
      expect(encryptor.decrypt(packed)).toBe('secret value');
      expect(() => encryptor.decrypt(`${packed.slice(0, -2)}AA`)).toThrow();
      expect(() => encryptor.decrypt('')).toThrow();
      expect(() => encryptor.unpack(undefined)).toThrow('Error while unpacking');
      expect(encryptor.unpack('aXY=:dGFn:ZGF0YQ==').encryptedData.toString()).toBe('data');
    });

    it('requires a key and a valid configuration', () => {
      expect(() => new Encryptor({})).toThrow('Encryption key is required.');
      expect(() => new Encryptor(undefined)).toThrow();
      const odd = new Encryptor({ key, ivSize: 16, algorithm: 'aes-256-gcm' });
      expect(odd.decrypt(odd.encrypt('x'))).toBe('x');
      expect(() => new Encryptor({ key: 'short' }).encrypt('x')).toThrow('Error while encrypting data');
    });
  });

  describe('RemoteStaticCache', () => {
    it('does not cache when Redis is not configured', async () => {
      (RemoteStaticCache as any).singleton = undefined;
      const cache = new RemoteStaticCache({ useCache: true }, { isEnabled: false });
      expect(await cache.getAndUpdateByRemoteUrl('http://static.test/a.json', {})).toBeUndefined();
      expect(cache.formKeyFromUrl('http://static.test/a.json')).toBe(`static-url:${Buffer.from('http://static.test/a.json').toString('base64')}`);
    });

    it('serves the previous answer and refreshes it in the background', async () => {
      (RemoteStaticCache as any).singleton = undefined;
      const { host, port } = getConfig().redis;
      const cache = new RemoteStaticCache({ useCache: true }, { isEnabled: true, host, port });
      nock('http://static.test').get('/b.json').twice().reply(200, { version: 1 });
      expect(await cache.getAndUpdateByRemoteUrl('http://static.test/b.json', { timeout: 1000 })).toBeFalsy();
      await app.waitFor(async () => (await cache.client.get(cache.formKeyFromUrl('http://static.test/b.json'))) !== null);
      expect(await cache.getAndUpdateByRemoteUrl('http://static.test/b.json', {})).toEqual({ version: 1 });
      await app.waitFor(() => nock.isDone());
      nock('http://static.test').get('/c.json').reply(500, {});
      await cache.getAndUpdateByRemoteUrl('http://static.test/c.json', {});
      await app.waitFor(() => nock.isDone());
    });
  });
});
