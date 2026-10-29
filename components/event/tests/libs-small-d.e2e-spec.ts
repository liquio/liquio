import crypto from 'node:crypto';

import nock from 'nock';

import { Encryptor } from '../src/lib/encryptor';
import { Sign } from '../src/lib/sign';
import { PersistLink } from '../src/lib/persist_link';
import { TestApp } from './test-app';

const SIGN = 'http://sign.test';
const PL = 'http://pl.test';

describe('Group D - encryptor, sign, persist link', () => {
  let app: TestApp;
  const key = crypto.randomBytes(32).toString('base64');

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup({});
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });
  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    Sign.singleton = undefined as any;
    PersistLink.singleton = undefined as any;
    await TestApp.afterAll(app);
  });
  afterEach(() => nock.cleanAll());

  describe('Encryptor', () => {
    it('requires a key', () => {
      expect(() => new Encryptor({})).toThrow('Encryption key is required.');
      expect(() => new Encryptor(undefined as any)).toThrow('Encryption key is required.');
    });

    it('uses defaults', () => {
      const e = new Encryptor({ key });
      expect(e.ivSize).toBe(12);
      expect(e.algorithm).toBe('aes-256-gcm');
    });

    it('round-trips data and packs iv:tag:data', () => {
      const e = new Encryptor({ key });
      const packed = e.encrypt('secret: тест');
      expect(packed.split(':')).toHaveLength(3);
      expect(Buffer.from(packed.split(':')[0], 'base64')).toHaveLength(12);
      expect(Buffer.from(packed.split(':')[1], 'base64')).toHaveLength(16);
      expect(e.decrypt(packed)).toBe('secret: тест');
      expect(e.encrypt('secret: тест')).not.toBe(packed);
    });

    it('honours custom iv size', () => {
      const e = new Encryptor({ key, ivSize: 16 });
      const packed = e.encrypt('x');
      expect(Buffer.from(packed.split(':')[0], 'base64')).toHaveLength(16);
      expect(e.decrypt(packed)).toBe('x');
    });

    it('wraps encrypt errors', () => {
      const e = new Encryptor({ key: Buffer.from('short').toString('base64') });
      try {
        e.encrypt('x');
        throw new Error('no throw');
      } catch (err: any) {
        expect(err.message).toMatch(/^Error while encrypting data: /);
        expect(err.cause).toBeDefined();
      }
    });

    it('rejects invalid auth tag length', () => {
      const e = new Encryptor({ key });
      const [iv, , data] = e.encrypt('x').split(':');
      const bad = [iv, Buffer.from('abc').toString('base64'), data].join(':');
      expect(() => e.decrypt(bad)).toThrow('Error while decrypting data: Invalid authentication tag length. Expected 16 bytes.');
    });

    it('rejects tampered data', () => {
      const e = new Encryptor({ key });
      const other = new Encryptor({ key: crypto.randomBytes(32).toString('base64') });
      expect(() => other.decrypt(e.encrypt('hello'))).toThrow(/^Error while decrypting data: /);
    });

    it('wraps unpack errors', () => {
      const e = new Encryptor({ key });
      expect(() => e.unpack(undefined as any)).toThrow(/^Error while unpacking: /);
      expect(() => e.decrypt(undefined as any)).toThrow(/^Error while decrypting data: Error while unpacking: /);
    });

    it('pack and unpack are inverse', () => {
      const e = new Encryptor({ key });
      const iv = Buffer.from('123456789012');
      const tag = Buffer.alloc(16, 1);
      const packed = e.pack('AAAA', iv, tag);
      const u = e.unpack(packed);
      expect(u.iv.equals(iv)).toBe(true);
      expect(u.authTag.equals(tag)).toBe(true);
      expect(u.encryptedData.toString('base64')).toBe('AAAA');
    });
  });

  describe('Sign', () => {
    let sign: Sign;
    beforeAll(() => {
      Sign.singleton = undefined as any;
      sign = new Sign({ url: SIGN, token: 'tok', timeout: 1000 });
    });

    it('is a singleton with default timeout', () => {
      expect(new Sign({ url: 'http://other' })).toBe(sign);
      expect(sign.url).toBe(SIGN);
      Sign.singleton = undefined as any;
      const s2 = new Sign({ url: SIGN, token: 't' });
      expect(s2.timeout).toBe(10000);
      Sign.singleton = sign;
    });

    it('sign posts payload with token', async () => {
      nock(SIGN, { reqheaders: { token: 'tok' } })
        .post('/sign', { data: 'abc', externalSign: true, signType: '', base64: false })
        .reply(200, 'SIGNED');
      expect(await sign.sign('abc')).toBe('SIGNED');
      nock(SIGN).post('/sign', { data: 'abc', externalSign: false, signType: 'cades', base64: true }).reply(200, 'S2');
      expect(await sign.sign('abc', false, 'cades', true)).toBe('S2');
    });

    it('signHash, hash, encrypt', async () => {
      nock(SIGN).post('/sign-hash', { data: 'h' }).reply(200, 'SH');
      nock(SIGN).post('/hash', { data: 'd' }).reply(200, 'HASH');
      nock(SIGN).post('/encrypt', { cert: 'c', data: 'd' }).reply(200, 'ENC');
      expect(await sign.signHash('h')).toBe('SH');
      expect(await sign.hash('d')).toBe('HASH');
      expect(await sign.encrypt('c', 'd')).toBe('ENC');
    });

    it('decrypt returns a promise-wrapped axios promise data (undefined)', async () => {
      const scope = nock(SIGN).post('/decrypt', { cert: 'c', data: 'd' }).reply(200, 'DEC');
      // Production awaits `(axios(...)).data`, which is undefined on a Promise.
      expect(await sign.decrypt('c', 'd')).toBeUndefined();
      await new Promise((r) => setTimeout(r, 100));
      expect(scope.isDone()).toBe(true);
    });

    it('convertInternalSignatureToExternal unwraps data.data', async () => {
      nock(SIGN).post('/internal-signature-to-external', { data: 'int' }).reply(200, { data: 'EXT' });
      expect(await sign.convertInternalSignatureToExternal('int')).toBe('EXT');
      nock(SIGN).post('/internal-signature-to-external').reply(200, {});
      expect(await sign.convertInternalSignatureToExternal('int')).toBeUndefined();
    });

    it('logs and rethrows on failure for every method', async () => {
      const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
      const calls: [string, string, () => Promise<any>][] = [
        ['/sign', 'sign-service-sign-error', () => sign.sign('a')],
        ['/sign-hash', 'sign-service-sign-hash-error', () => sign.signHash('a')],
        ['/hash', 'sign-service-hash-error', () => sign.hash('a')],
        ['/encrypt', 'sign-service-encrypt-error', () => sign.encrypt('c', 'a')],
        [
          '/internal-signature-to-external',
          'sign-service-convert-internal-signature-to-external-error',
          () => sign.convertInternalSignatureToExternal('a'),
        ],
      ];
      for (const [path, logName, fn] of calls) {
        nock(SIGN).post(path).reply(500, { message: 'boom' });
        await expect(fn()).rejects.toThrow('Request failed with status code 500');
        const call = save.mock.calls.find((c) => c[0] === logName)!;
        expect(call[2]).toBe('error');
        expect((call[1] as any).requestOptions.data).toBe('*****');
        expect((call[1] as any).requestOptions.headers).toBe('*****');
        expect((call[1] as any).status).toBe(500);
      }
      save.mockRestore();
    });
  });

  describe('PersistLink', () => {
    let pl: PersistLink;
    const cfg = {
      server: PL,
      port: 80,
      token: 'pt',
      urlToDocument: 'http://doc.test/d',
      urlToCaseAndProceeding: 'http://doc.test/c',
      serverName: 'srv',
      routes: { generateQr: '/gen' },
    };
    beforeAll(() => {
      PersistLink.singleton = undefined as any;
      pl = new PersistLink(cfg);
    });

    it('builds config and urls', () => {
      expect(pl.generateQr).toBe(`${PL}:80/gen`);
      expect(pl.sendTestPingUrl).toBe(`${PL}:80/test/ping_with_auth`);
      expect(pl.getLinkToFilestorageTimeout).toBe(30000);
      expect(new PersistLink({})).toBe(pl);
    });

    it('document link and qr', async () => {
      const body = { type: 'simple', options: { url: 'http://doc.test/d/D1', redirect: true }, small: true };
      nock(`${PL}:80`, { reqheaders: { token: 'pt' } })
        .post('/gen', body)
        .times(3)
        .reply(200, { data: { link: 'L', qrCode: 'Q' } });
      expect(await pl.getQrAndLinkToDocument('D1')).toEqual({ link: 'L', qrCode: 'Q' });
      expect(await pl.getLinkToDocument('D1')).toBe('L');
      expect(await pl.getQrLinkToDocument('D1')).toBe('Q');
    });

    it('case and proceeding links', async () => {
      nock(`${PL}:80`)
        .post('/gen', { type: 'simple', options: { url: 'http://doc.test/c=C1', redirect: true }, small: true })
        .times(2)
        .reply(200, { data: { link: 'LC', qrCode: 'QC' } });
      nock(`${PL}:80`)
        .post('/gen', { type: 'simple', options: { url: 'http://doc.test/c=C1/proceeding=P1', redirect: true }, small: true })
        .times(2)
        .reply(200, { data: { link: 'LP', qrCode: 'QP' } });
      expect(await pl.getQrAndLinkToCase('C1')).toEqual({ link: 'LC', qrCode: 'QC' });
      expect(await pl.getLinkToCase('C1')).toBe('LC');
      expect(await pl.getQrAndLinkToProceeding('P1', 'C1')).toEqual({ link: 'LP', qrCode: 'QP' });
      expect(await pl.getLinkToProceeding('P1', 'C1')).toBe('LP');
    });

    it('static file qr (openstack) and filestorage link', async () => {
      nock(`${PL}:80`)
        .post('/gen', { type: 'openStack', options: { serverName: 'srv', fileName: 'f.pdf' }, small: true })
        .reply(200, { data: { qrCode: 'QR' } });
      expect(await pl.getQrLinkToStaticFileInOpenStack('f.pdf')).toBe('QR');
      nock(`${PL}:80`)
        .post('/gen', { type: 'filestorage', options: { serverName: 'srv', fileId: 'F1' }, definedHash: 'H', small: true })
        .reply(200, { data: { link: 'FL' } });
      expect(await pl.getLinkToStaticFileInFilestorage('F1', 'H')).toBe('FL');
    });

    it('logs and rethrows request errors', async () => {
      const save = jest.spyOn(global.log, 'save').mockImplementation(() => undefined as any);
      const fns: [string, () => Promise<any>][] = [
        ['get-persist-link-to-document-response-error', () => pl.getQrAndLinkToDocument('D')],
        ['get-persist-link-to-case-response-error', () => pl.getQrAndLinkToCase('C')],
        ['get-persist-link-to-permission-response-error', () => pl.getQrAndLinkToProceeding('P', 'C')],
        ['get-persist-link-to-static-file-response-error', () => pl.getQrLinkToStaticFileInOpenStack('f')],
      ];
      for (const [name, fn] of fns) {
        nock(`${PL}:80`).post('/gen').reply(500, {});
        await expect(fn()).rejects.toThrow('Request failed with status code 500');
        expect(save.mock.calls.some((c) => c[0] === name && c[2] === 'error')).toBe(true);
      }
      save.mockRestore();
    });

    it('filestorage link wraps errors with descriptive messages', async () => {
      const url = `${PL}:80/gen`;
      nock(`${PL}:80`)
        .post('/gen')
        .reply(401, { error: { message: 'bad token' } });
      await expect(pl.getLinkToStaticFileInFilestorage('F', 'H')).rejects.toThrow(
        `Persist-link auth error (POST ${url}) [401 Unauthorized]: bad token`,
      );
      nock(`${PL}:80`).post('/gen').reply(401, 'x');
      await expect(pl.getLinkToStaticFileInFilestorage('F', 'H')).rejects.toThrow('persist-link token is invalid or not allowed');
      nock(`${PL}:80`).post('/gen').reply(404, 'nf');
      await expect(pl.getLinkToStaticFileInFilestorage('F', 'H')).rejects.toThrow(
        `Persist-link request failed (POST ${url}) [404 Not Found]: Request failed with status code 404`,
      );
      nock(`${PL}:80`).post('/gen').replyWithError('plain failure');
      const err: any = await pl.getLinkToStaticFileInFilestorage('F', 'H').catch((e) => e);
      expect(err.message).toMatch(/^Persist-link request failed \(/);
      expect(err.cause).toBeDefined();
    });

    it('sendPingRequest returns headers and body', async () => {
      nock(`${PL}:80`, { reqheaders: { token: 'pt' } })
        .get('/test/ping_with_auth')
        .reply(200, { data: { ok: 1 } }, { version: '1.2', customer: 'cu', environment: 'env' });
      expect(await pl.sendPingRequest()).toEqual({ version: '1.2', customer: 'cu', environment: 'env', body: { ok: 1 } });
      nock(`${PL}:80`).get('/test/ping_with_auth').reply(500, {});
      await expect(pl.sendPingRequest()).rejects.toThrow('Request failed with status code 500');
    });
  });
});
