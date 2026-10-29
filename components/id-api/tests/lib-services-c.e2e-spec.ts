import crypto from 'crypto';

import { AxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import nock from 'nock';

import { TestApp, config } from './test_app';
import { Services } from '../src/services';
import { EdsService } from '../src/services/eds.service';
import { PingRequestService } from '../src/services/ping_request.service';
import { X509Service } from '../src/services/x509.service';
import { Errors } from '../src/lib/errors';
import {
  Helpers,
  avatarByGender,
  validateEmail,
  delay,
  generatePinCode,
  generateRandomBase36,
  shortenStringWithPrefixSuffix,
} from '../src/lib/helpers';
import * as sc from '../src/lib/string_converter';
import type * as CfgModule from '../src/config';

const cfgModule: typeof CfgModule = jest.requireActual('../src/config');
const SIGN_TOOL = 'http://sign-tool';
const EMOJI = String.fromCodePoint(0x1f600);

describe('Lib and services coverage (group C)', () => {
  beforeAll(async () => {
    await TestApp.beforeAll();
    await TestApp.beforeEach();
    config.confirmCodeLength = 6;
    await TestApp.setup();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  describe('string_converter', () => {
    it('hex2char / dec2char / dec2hex', () => {
      expect(sc.hex2char('41')).toBe('A');
      expect(sc.hex2char('1F600')).toBe(EMOJI);
      expect(sc.hex2char('110000')).toBe('hex2Char error: Code point out of range: 110000');
      expect(sc.dec2char(65)).toBe('A');
      expect(sc.dec2char(0x1f600)).toBe(EMOJI);
      expect(sc.dec2char(0x110000)).toBe('dec2char error: Code point out of range: 110000');
      expect(sc.dec2hex(255)).toBe('FF');
    });

    it('simple escape converters', () => {
      expect(sc.convertUnicode2Char('U+0041 u+10FFFF')).toBe('A ' + String.fromCodePoint(0x10ffff));
      expect(sc.convertHexNCR2Char('&#x41;&#x1F600;')).toBe('A' + EMOJI);
      expect(sc.convertDecNCR2Char('&#65;&#128512;')).toBe('A' + EMOJI);
      expect(sc.convertZeroX2Char('0x41')).toBe('A');
    });

    it('convertCSS2Char with and without backslash conversion', () => {
      expect(sc.convertCSS2Char('\\41 b', false)).toBe('Ab');
      expect(sc.convertCSS2Char('\\4', false)).toBe('\\4');
      expect(sc.convertCSS2Char('\\41 \\x', true)).toBe('Ax');
    });

    it('convertjEsc2Char', () => {
      expect(sc.convertjEsc2Char('\\u{1F600}\\U0001F600\\u0041', false)).toBe(EMOJI + EMOJI + 'A');
      expect(sc.convertjEsc2Char('a\\nb', false)).toBe('a\\nb');
      expect(sc.convertjEsc2Char('\\b\\t\\n\\v\\f\\r\\\'\\"\\\\', true)).toBe('\b\t\n\v\f\r\'"\\');
    });

    it('convertpEnc2Char / convertpEsc2Char', () => {
      expect(sc.convertpEnc2Char('%41')).toBe('A');
      expect(sc.convertpEnc2Char('x%C3%A9y')).toBe('xéy');
      expect(sc.convertpEnc2Char('%E2%82%AC')).toBe('€');
      expect(sc.convertpEnc2Char('%F0%9F%98%80')).toBe(EMOJI);
      expect(sc.convertpEnc2Char('%80')).toBe('convertpEsc2Char: error 80! ');
      expect(sc.convertpEnc2Char('%C3%41').startsWith('convertpEsc2Char: error 41! ')).toBe(true);
      expect(sc.convertpEnc2Char('%E2%41%AC').startsWith('convertpEsc2Char: error 41! ')).toBe(true);
    });

    it('convertEntities2Char', () => {
      expect(sc.convertEntities2Char('a &amp; b &lt;&none;&unknownzz;')).toBe('a & b <&unknownzz;');
    });

    it('convertNumbers2Char for every type', () => {
      expect(sc.convertNumbers2Char('41 42', 'hex')).toBe('A B');
      expect(sc.convertNumbers2Char('65 66', 'dec')).toBe('A B');
      expect(sc.convertNumbers2Char('x 41 42', 'utf8')).toBe('xAB');
      expect(sc.convertNumbers2Char('x C3 A9', 'utf8')).toBe('xé');
      expect(sc.convertNumbers2Char('x D83D DE00', 'utf16')).toBe('x' + EMOJI);
      expect(sc.convertNumbers2Char('41 42', 'none')).toBe('41 42');
    });

    it('convertUTF82Char', () => {
      expect(sc.convertUTF82Char('  ')).toBe('');
      expect(sc.convertUTF82Char(' 41   42 ')).toBe('AB');
      expect(sc.convertUTF82Char('C3 A9')).toBe('é');
      expect(sc.convertUTF82Char('E2 82 AC')).toBe('€');
      expect(sc.convertUTF82Char('F0 9F 98 80')).toBe(EMOJI);
      expect(sc.convertUTF82Char('FF')).toBe('convertUTF82Char: error1 FF!');
      expect(sc.convertUTF82Char('C3 41').startsWith('convertUTF82Char: error2 41! ')).toBe(true);
      expect(sc.convertUTF82Char('E2 41 AC').startsWith('convertUTF82Char: error3 41! ')).toBe(true);
    });

    it('convertUTF162Char', () => {
      expect(sc.convertUTF162Char('  ')).toBe('');
      expect(sc.convertUTF162Char(' 41  42')).toBe('AB');
      expect(sc.convertUTF162Char('D83D DE00')).toBe(EMOJI);
      expect(sc.convertUTF162Char('D83D 41')).toBe('Error in convertUTF162Char: low surrogate expected, b=41!A');
      expect(sc.convertUTF162Char('10000').startsWith('!Error in convertUTF162Char: unexpected value, b=10000!')).toBe(true);
    });

    it('convertAllEscapes', () => {
      expect(sc.convertAllEscapes('U+0041 &#x42; &#67; \\u0044 &amp; %45', 'none')).toBe('A B C D & E');
      expect(sc.convertAllEscapes('x 41', 'utf8')).toBe('xA');
    });
  });

  describe('Helpers', () => {
    it('cutLongStrings: strings, scalars and small objects', () => {
      expect(Helpers.cutLongStrings('short')).toBe('short');
      expect(Helpers.cutLongStrings('a'.repeat(100))).toBe('a'.repeat(79) + '…');
      expect(Helpers.cutLongStrings(5 as any)).toBe(5);
      expect(Helpers.cutLongStrings('{"a":"b"}')).toEqual({ a: 'b' });
      expect(Helpers.cutLongStrings({ a: 'b' })).toEqual({ a: 'b' });
    });

    it('cutLongStrings: shortens values of big objects and arrays', () => {
      expect(Helpers.cutLongStrings({ a: 'x'.repeat(100), b: 'y'.repeat(100) })).toEqual({ a: 'x'.repeat(9) + '…', b: 'y'.repeat(9) + '…' });
      expect(Helpers.cutLongStrings(Array(5).fill('x'.repeat(100)))).toEqual(Array(5).fill('x'.repeat(9) + '…'));
      expect(Helpers.cutLongStrings({ a: 'x'.repeat(100), n: 1 })).toEqual({ a: 'x'.repeat(9) + '…', n: 1 });
    });

    it('cutLongStrings: falls back to a truncated JSON string', () => {
      expect(Helpers.cutLongStrings({ a: 'x'.repeat(100), b: 'y'.repeat(100) }, 20)).toBe('{"a":"xxxxxxxxx…","b');
    });

    it('cutLongStrings: uses smaller per-value limit for huge limits', () => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < 200; i++) obj[`k${i}`] = 'z'.repeat(1000);
      const res = Helpers.cutLongStrings(obj, 10000) as Record<string, string>;
      expect(Object.keys(res)).toHaveLength(200);
      expect(res.k0).toBe('z'.repeat(9) + '…');
    });

    it('shorten', () => {
      expect(Helpers.shorten(undefined as any)).toBe('');
      expect(Helpers.shorten('abc')).toBe('abc');
      expect(Helpers.shorten('a'.repeat(100), 10)).toBe('a'.repeat(9) + '…');
      expect(() => Helpers.shorten(5 as any)).toThrow(new TypeError('Expected a string input'));
    });

    it('processError', () => {
      const typeErr = new TypeError('bad type');
      expect(Helpers.processError(typeErr)).toEqual({ error: 'bad type', stack: typeErr.stack });
      expect(Helpers.processError(new Error('plain'))).toEqual({ error: 'Error: plain' });
      expect(Helpers.processError('str')).toEqual({ error: 'str' });
    });

    it('prepareAxiosErrorToLog', () => {
      expect(Helpers.prepareAxiosErrorToLog(new Error('x'))).toBe('Error: x');
      const err = new AxiosError('msg', 'ECODE', { baseURL: 'http://b', url: '/u', method: 'get', headers: { a: 'b' } } as any, null, {
        status: 500,
        statusText: 'ISE',
        data: { d: 1 },
        headers: { h: '1' },
      } as any);
      expect(Helpers.prepareAxiosErrorToLog(err)).toEqual({
        error: 'msg',
        code: 'ECODE',
        status: 500,
        statusText: 'ISE',
        responseData: { d: 1 },
        url: 'http://b/u',
        method: 'GET',
        headers: { h: '1' },
      });
      const withHeaders: any = Helpers.prepareAxiosErrorToLog(err, { withHeaders: true });
      expect(withHeaders.headers).toEqual({ a: 'b' });
      const bare: any = Helpers.prepareAxiosErrorToLog(new AxiosError('only'));
      expect(bare).toMatchObject({
        error: 'only',
        status: 'UNKNOWN_ERROR_STATUS',
        code: 'UNKNOWN_ERROR_CODE',
        method: '',
        responseData: {},
        headers: {},
      });
    });

    it('small helper functions', async () => {
      expect(avatarByGender('male')).toBe('/img/avatar-male.svg');
      expect(avatarByGender('female')).toBe('/img/avatar-female.svg');
      expect(avatarByGender()).toBe('/img/avatar-female.svg');
      expect(validateEmail('a@b.com')).toBe(true);
      expect(validateEmail('nope')).toBe(false);
      expect(validateEmail()).toBe(false);
      await expect(delay(1)).resolves.toBeUndefined();
      expect(generatePinCode(6)).toMatch(/^\d{6}$/);
      const b36 = generateRandomBase36(8);
      expect(typeof b36).toBe('string');
      expect(b36.length).toBeLessThanOrEqual(8);
      expect(shortenStringWithPrefixSuffix('abcdefghijkl')).toBe('abcd…ijkl');
      expect(shortenStringWithPrefixSuffix('abcd')).toBe('abcd');
      expect(shortenStringWithPrefixSuffix('')).toBe('');
      expect(shortenStringWithPrefixSuffix(5 as any)).toBe('');
    });
  });

  describe('config', () => {
    const loadIsolated = (envJson: string | undefined, env = 'test') => {
      const prevJson = process.env.LIQUIO_ID_CONFIG;
      const prevEnv = process.env.NODE_ENV;
      if (envJson === undefined) delete process.env.LIQUIO_ID_CONFIG;
      else process.env.LIQUIO_ID_CONFIG = envJson;
      process.env.NODE_ENV = env;
      try {
        let mod: typeof CfgModule | undefined;
        jest.isolateModules(() => {
          mod = jest.requireActual('../src/config');
        });
        return mod!.loadConfig();
      } finally {
        if (prevJson === undefined) delete process.env.LIQUIO_ID_CONFIG;
        else process.env.LIQUIO_ID_CONFIG = prevJson;
        process.env.NODE_ENV = prevEnv;
      }
    };

    it('loadConfig rejects invalid JSON and missing env', () => {
      expect(() => loadIsolated('{nope')).toThrow(/^LIQUIO_ID_CONFIG is invalid json: /);
      expect(() => loadIsolated('{"other":{}}')).toThrow('LIQUIO_ID_CONFIG [test] is not defined object config.');
    });

    it('loadConfig returns the env section and caches it', () => {
      const cfg = loadIsolated(JSON.stringify({ test: { port: 1234 } }));
      expect(cfg).toEqual({ port: 1234 });
    });

    it('loadConfig validates OIDC providers', () => {
      const bad = { test: { auth_providers: { oidc: { p1: { isEnabled: true } } } } };
      expect(() => loadIsolated(JSON.stringify(bad))).toThrow(
        'Invalid OIDC provider config [p1]: clientID is required; clientSecret is required; callbackURL is required; ' +
          'must have either "issuer" or all of "authorizationURL", "tokenURL", "userInfoURL"',
      );
      const ok = {
        test: {
          auth_providers: {
            oidc: {
              off: { isEnabled: false },
              on: { clientID: 'a', clientSecret: 'b', callbackURL: 'http://cb', issuer: 'http://iss' },
              ep: {
                clientID: 'a',
                clientSecret: 'b',
                callbackURL: 'http://cb',
                authorizationURL: 'http://a',
                tokenURL: 'http://t',
                userInfoURL: 'http://u',
              },
            },
          },
        },
      };
      expect(loadIsolated(JSON.stringify(ok)).auth_providers?.oidc?.on?.issuer).toBe('http://iss');
    });

    it('loadConfig validates EDS, LDAP and internal transport', () => {
      expect(() => loadIsolated(JSON.stringify({ test: { auth_providers: { eds: { isEnabled: true } } } }))).toThrow(
        /^Invalid EDS provider config: clientID is required/,
      );
      expect(() => loadIsolated(JSON.stringify({ test: { auth_providers: { ldap: { isEnabled: true } } } }))).toThrow(
        /^Invalid LDAP provider config: connection.url is required/,
      );
      expect(() => loadIsolated(JSON.stringify({ production: { x509: { externalUrl: 'http://sign-tool' } } }), 'production')).toThrow(
        /^Insecure internal service URLs in production: x509.externalUrl=http:\/\/sign-tool\. /,
      );
    });

    it('loadConfig from files rejects a config without db section', () => {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idcfg-'));
      const prev = process.env.CONFIG_PATH;
      process.env.CONFIG_PATH = dir;
      try {
        fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ default_env: 'dev', dev: { port: 1 } }));
        expect(() => loadIsolated(undefined, 'localhost')).toThrow("Config for env [dev] is not defined or missing 'db' section.");
        fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ default_env: 'dev', dev: { db: { host: 'h' }, port: 2 } }));
        fs.writeFileSync(path.join(dir, 'versions.json'), JSON.stringify({ versions: { services: [{ name: 'eds', minVersion: '1.0.0' }] } }));
        const cfg = loadIsolated(undefined, 'localhost');
        expect(cfg.port).toBe(2);
        expect((cfg as any).versions).toEqual({ services: [{ name: 'eds', minVersion: '1.0.0' }] });
      } finally {
        if (prev === undefined) delete process.env.CONFIG_PATH;
        else process.env.CONFIG_PATH = prev;
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('validateEdsConfig', () => {
      expect(() => cfgModule.validateEdsConfig({} as any)).not.toThrow();
      expect(() => cfgModule.validateEdsConfig({ auth_providers: { eds: { isEnabled: false } } } as any)).not.toThrow();
      expect(() =>
        cfgModule.validateEdsConfig({
          auth_providers: { eds: { isEnabled: true, clientID: ' ', clientSecret: '<secret>', callbackURL: 'CHANGEME' } },
        } as any),
      ).toThrow('Invalid EDS provider config: clientID is required; clientSecret must not be a placeholder; callbackURL must not be a placeholder');
      expect(() =>
        cfgModule.validateEdsConfig({
          auth_providers: { eds: { isEnabled: true, clientID: 'a', clientSecret: 'b', callbackURL: 'http://x' } },
        } as any),
      ).not.toThrow();
    });

    it('validateLdapConfig', () => {
      expect(() => cfgModule.validateLdapConfig({} as any)).not.toThrow();
      expect(() =>
        cfgModule.validateLdapConfig({
          auth_providers: { ldap: { isEnabled: true, connection: { url: 'http://x' }, accessGroups: [' ', 5], sync: { intervalMinutes: 0 } } },
        } as any),
      ).toThrow(
        'Invalid LDAP provider config: connection.url must use the ldap:// or ldaps:// scheme; connection.bindDN is required; ' +
          'connection.bindPassword is required; baseDN is required; accessGroups must contain at least one group; sync.intervalMinutes must be a number greater than 0',
      );
      expect(() =>
        cfgModule.validateLdapConfig({
          auth_providers: {
            ldap: {
              isEnabled: true,
              connection: { url: 'ldaps://x', bindDN: 'cn=a', bindPassword: 'p' },
              baseDN: 'dc=x',
              accessGroups: ['g'],
              sync: { intervalMinutes: 5 },
            },
          },
        } as any),
      ).not.toThrow();
    });

    it('getInternalServiceUrls and validateInternalTransportConfig', () => {
      const cfg: any = { notify: { url: 'http://n' }, pingRoutes: { notify: ' ' }, x509: { externalUrl: 'https://x' } };
      expect(cfgModule.getInternalServiceUrls(cfg)).toEqual([
        { path: 'notify.url', url: 'http://n' },
        { path: 'x509.externalUrl', url: 'https://x' },
      ]);
      expect(() => cfgModule.validateInternalTransportConfig(cfg, 'localhost')).not.toThrow();
      expect(() => cfgModule.validateInternalTransportConfig({ ...cfg, internalTransport: { allowPlainHttp: true } }, 'production')).not.toThrow();
      expect(() => cfgModule.validateInternalTransportConfig({ x509: { externalUrl: 'https://x' } } as any, 'prod')).not.toThrow();
      expect(() => cfgModule.validateInternalTransportConfig(cfg, 'prod')).toThrow(
        /Insecure internal service URLs in production: notify.url=http:\/\/n\. /,
      );
    });
  });

  describe('PingRequestService', () => {
    const make = (over: Record<string, any> = {}) =>
      new PingRequestService(
        { ...config, customer: '1', environment: '0', versions: { services: [{ name: 'notify', minVersion: '1.2.3' }] }, ...over } as any,
        {} as any,
        {} as any,
      );
    const pong = { data: { message: 'pong' } };
    const notifyHost = 'http://notification.liquio.local';

    const ping = async (headers: Record<string, string>, body: any = pong, svc = make()) => {
      nock(notifyHost).get('/test/ping_with_auth').reply(200, body, headers);
      return svc.sendPingRequest('notify');
    };

    it('rejects unknown service name', async () => {
      await expect(make().sendPingRequest('other')).rejects.toThrow('Not correct service name');
    });

    it('reports a healthy notify service', async () => {
      const res = await ping({ version: '1.2.3', customer: '1', environment: '0' });
      expect(res).toEqual({
        isCorrectConnection: true,
        wideCheckRes: { versionsEqual: true, customerEqual: true, environmentEqual: true, meta: undefined },
      });
    });

    it('accepts top-level pong message', async () => {
      const res = await ping({ version: '1.2.3', customer: '1', environment: '0' }, { message: 'pong' });
      expect(res.isCorrectConnection).toBe(true);
    });

    it.each([
      ['2.0.0', true],
      ['1.3.0', true],
      ['1.2.4', true],
      ['1.2.3', true],
      ['1.2.2', false],
      ['1.1.9', false],
      ['0.9.9', false],
    ])('compares version %s against minimum 1.2.3', async (version, expected) => {
      const res = await ping({ version, customer: '1', environment: '0' });
      expect(res.wideCheckRes.versionsEqual).toBe(expected);
    });

    it('returns meta for mismatching customer, environment and version', async () => {
      const res = await ping({ version: '1.0.0', customer: '2', environment: '5' });
      expect(res.wideCheckRes).toEqual({
        versionsEqual: false,
        customerEqual: false,
        environmentEqual: false,
        meta: { versionsEqual: false, customerEqual: false, environmentEqual: false },
      });
    });

    it('treats missing headers as failed checks', async () => {
      const res = await ping({});
      expect(res.wideCheckRes.versionsEqual).toBe(false);
      expect(res.wideCheckRes.customerEqual).toBe(false);
      expect(res.wideCheckRes.environmentEqual).toBe(false);
    });

    it('omits meta when the service answered something other than pong', async () => {
      const res = await ping({ version: '0.0.1', customer: '9', environment: '9' }, { message: 'nope' });
      expect(res.isCorrectConnection).toBe(false);
      expect(res.wideCheckRes.meta).toBeUndefined();
      expect(res.wideCheckRes.customerEqual).toBe(false);
    });

    it('falls back to default customer, environment and minimum version', async () => {
      const svc = make({ customer: undefined, environment: undefined, versions: undefined });
      const res = await ping({ version: '0.0.0', customer: '1', environment: '0' }, pong, svc);
      expect(res.wideCheckRes).toEqual({ versionsEqual: true, customerEqual: true, environmentEqual: true, meta: undefined });
    });

    it('pings the eds service', async () => {
      nock('https://eds-service.liquio.local').get('/api/v1/test/ping').reply(200, pong, { version: '1.2.3', customer: '1', environment: '0' });
      const res = await make({ versions: { services: [] } }).sendPingRequest('eds');
      expect(res.isCorrectConnection).toBe(true);
    });
  });

  describe('X509Service', () => {
    const make = () => new X509Service(config as any, {} as any, {} as any);

    it('requires config.x509.externalUrl', () => {
      expect(() => new X509Service({ ...config, x509: undefined } as any, {} as any, {} as any)).toThrow(
        '`config.x509.externalUrl` is not configured.',
      );
    });

    it('init succeeds on ping 200 and wraps failures', async () => {
      nock(SIGN_TOOL).get('/test/ping').reply(200, 'ok');
      await expect(make().init()).resolves.toBeUndefined();
      nock(SIGN_TOOL).get('/test/ping').reply(500, 'down');
      await expect(make().init()).rejects.toThrow(/^Sign-tool connection failed: /);
      nock(SIGN_TOOL).get('/test/ping').reply(204);
      await expect(make().init()).rejects.toThrow(/^Sign-tool connection failed: Error: Invalid response/);
    });

    it('getSignatureInfo posts base64 and decodes content', async () => {
      const scope = nock(SIGN_TOOL)
        .post('/x509/signature-info', { sign: Buffer.from('sig').toString('base64') })
        .twice()
        .reply(200, { serial: '1', content: Buffer.from('hello').toString('base64') });
      const fromBuffer = await make().getSignatureInfo(Buffer.from('sig'));
      expect(fromBuffer.content).toEqual(Buffer.from('hello'));
      const fromString = await make().getSignatureInfo(Buffer.from('sig').toString('base64'));
      expect(fromString.serial).toBe('1');
      expect(scope.isDone()).toBe(true);
    });

    it('getSignatureInfo returns response without content as is and rethrows errors with status', async () => {
      nock(SIGN_TOOL).post('/x509/signature-info').reply(200, { serial: '2' });
      expect(await make().getSignatureInfo('c2ln')).toEqual({ serial: '2' });
      nock(SIGN_TOOL).post('/x509/signature-info').reply(400, { message: 'bad sign' });
      const err: any = await make()
        .getSignatureInfo('c2ln')
        .catch((e) => e);
      expect(err.message).toBe('X509Service Error: bad sign');
      expect(err.status).toBe(400);
    });

    it('verifyHash encodes buffers and propagates errors', async () => {
      nock(SIGN_TOOL)
        .post('/x509/verify-hash', { hash: Buffer.from('h').toString('base64'), sign: Buffer.from('s').toString('base64') })
        .reply(200, { valid: true });
      expect(await make().verifyHash(Buffer.from('h'), Buffer.from('s'))).toEqual({ valid: true });
      nock(SIGN_TOOL).post('/x509/verify-hash', { hash: 'h', sign: 's' }).reply(500, {});
      await expect(make().verifyHash('h', 's')).rejects.toThrow(/^X509Service Error: Request failed with status code 500/);
    });

    it('hashData handles string, buffer, invalid types and output encodings', async () => {
      nock(SIGN_TOOL)
        .post('/x509/hash-data', { data: Buffer.from('abc').toString('base64'), isReturnAsBase64: true })
        .times(3)
        .reply(200, 'aGFzaA==');
      expect(await make().hashData('abc')).toEqual(Buffer.from('hash'));
      expect(await make().hashData(Buffer.from('abc'), true)).toBe('aGFzaA==');
      expect(await make().hashData(Buffer.from('abc'))).toEqual(Buffer.from('hash'));
      await expect(make().hashData(5 as any)).rejects.toThrow('X509External.hashData: Invalid data type. Expected Buffer or string, but got number.');
      nock(SIGN_TOOL).post('/x509/hash-data').replyWithError('socket hang up');
      const err: any = await make()
        .hashData('abc')
        .catch((e) => e);
      expect(err.message).toBe('X509Service Error: socket hang up');
      expect(err.status).toBeUndefined();
    });

    it('hashToInternalSignature encodes buffers and propagates errors', async () => {
      nock(SIGN_TOOL)
        .post('/x509/hash-to-internal-signature', { hash: Buffer.from('h').toString('base64'), content: Buffer.from('c').toString('base64') })
        .reply(200, 'internal');
      expect(await make().hashToInternalSignature(Buffer.from('h'), Buffer.from('c'))).toBe('internal');
      nock(SIGN_TOOL).post('/x509/hash-to-internal-signature', { hash: 'h', content: 'c' }).reply(422, { message: 'nope' });
      await expect(make().hashToInternalSignature('h', 'c')).rejects.toThrow('X509Service Error: nope');
    });

    it('getSignersRNOKPP encodes buffers and propagates errors', async () => {
      nock(SIGN_TOOL)
        .post('/x509/signers-rnokpp', { signature: Buffer.from('s').toString('base64') })
        .reply(200, ['1234567890']);
      expect(await make().getSignersRNOKPP(Buffer.from('s'))).toEqual(['1234567890']);
      nock(SIGN_TOOL).post('/x509/signers-rnokpp', { signature: 's' }).reply(400, { message: 'bad' });
      await expect(make().getSignersRNOKPP('s')).rejects.toThrow('X509Service Error: bad');
    });
  });

  describe('EdsService', () => {
    const encryption = { enabled: true, algorithm: 'aes-256-cbc', securityKey: '0123456789abcdef0123456789abcdef', iv: '0123456789abcdef' };
    const make = (over: Record<string, any> = {}) => new EdsService({ ...config, ...over } as any, {} as any, {} as any);
    const info = (token: string, over: Record<string, any> = {}) => ({
      subject: { commonName: 'Test Signer' },
      issuer: { commonName: 'Test CA', organizationName: 'Org' },
      serial: 'S1',
      content: Buffer.from(token),
      pem: 'PEM',
      ...over,
    });
    const stubServices = (x509: any, redis: any = { isEnabled: false }) => {
      const orig = Services.service.bind(Services);
      jest
        .spyOn(Services, 'service')
        .mockImplementation(((name: string) => (name === 'x509' ? x509 : name === 'redis' ? redis : orig(name as any))) as any);
    };
    const encrypt = (sign: string) => {
      const cipher = crypto.createCipheriv('aes-256-cbc', encryption.securityKey, encryption.iv);
      return cipher.update(JSON.stringify({ sign }), 'utf8', 'base64') + cipher.final('base64');
    };

    it('init resolves', async () => {
      await expect(make().init()).resolves.toBeUndefined();
    });

    it('getRandomContentToSign issues a verifiable JWT', async () => {
      const token = await make().getRandomContentToSign();
      const payload = jwt.verify(token, config.jwt!.secret!) as any;
      expect(payload.random).toMatch(/^[0-9a-f]{128}$/);
      expect(payload.exp - payload.iat).toBe(config.jwt!.expiresIn);
      const defaultTtl = jwt.decode(await make({ jwt: { secret: 's' } }).getRandomContentToSign()) as any;
      expect(defaultTtl.exp - defaultTtl.iat).toBe(60);
    });

    it('getRandomContentToSign fails without a JWT secret', async () => {
      await expect(make({ jwt: {} }).getRandomContentToSign()).rejects.toThrow(Errors.List.JWT_SECRET_NOT_FOUND.message);
    });

    it('checkRandomContentSign validates params and JWT', async () => {
      const svc = make({ encryption: undefined });
      await expect(svc.checkRandomContentSign(5 as any, 'sig')).rejects.toThrow(Errors.List.TOKEN_NOT_FOUND.message);
      await expect(svc.checkRandomContentSign('t', 5 as any)).rejects.toThrow(Errors.List.SIGNATURE_NOT_FOUND.message);
      await expect(svc.checkRandomContentSign('not-a-jwt', 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
      const token = await svc.getRandomContentToSign();
      await expect(make({ jwt: {}, encryption: undefined }).checkRandomContentSign(token, 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
      const expired = jwt.sign({ a: 1 }, config.jwt!.secret!, { expiresIn: -10 });
      await expect(svc.checkRandomContentSign(expired, 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
    });

    it('checkRandomContentSign returns signer info once and rejects replay (memory store)', async () => {
      const svc = make({ encryption: undefined });
      const token = await svc.getRandomContentToSign();
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info(token)) });
      await expect(svc.checkRandomContentSign(token, 'sig')).resolves.toEqual({
        signer: { commonName: 'Test Signer' },
        issuer: { commonName: 'Test CA', organizationName: 'Org' },
        serial: 'S1',
        pem: 'PEM',
      });
      await expect(svc.checkRandomContentSign(token, 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
    });

    it('checkRandomContentSign drops expired entries from the memory store', async () => {
      const svc = make({ encryption: undefined });
      (svc as any).usedTokens.set('stale', Date.now() - 1000);
      const token = await svc.getRandomContentToSign();
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info(token)) });
      await svc.checkRandomContentSign(token, 'sig');
      expect((svc as any).usedTokens.has('stale')).toBe(false);
      expect((svc as any).usedTokens.size).toBe(1);
    });

    it('checkRandomContentSign uses redis lock when enabled', async () => {
      const svc = make({ encryption: undefined });
      const token = await svc.getRandomContentToSign();
      const acquireLock = jest.fn().mockResolvedValueOnce('lock').mockResolvedValueOnce(null);
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info(token)) }, { isEnabled: true, acquireLock });
      await expect(svc.checkRandomContentSign(token, 'sig')).resolves.toMatchObject({ serial: 'S1' });
      await expect(svc.checkRandomContentSign(token, 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
      const key = crypto.createHash('sha256').update(token).digest('hex');
      expect(acquireLock.mock.calls[0][0]).toBe(`eds-used-token:${key}`);
      expect(acquireLock.mock.calls[0][1]).toBeGreaterThanOrEqual(1);
    });

    it('checkRandomContentSign maps signature info errors', async () => {
      const svc = make({ encryption: undefined });
      const token = await svc.getRandomContentToSign();
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info(token, { content: Buffer.from('other') })) });
      await expect(svc.checkRandomContentSign(token, 'sig')).rejects.toThrow(Errors.List.WRONG_SIGNED_CONTENT.message);
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info(token, { pem: undefined })) });
      await expect(svc.checkRandomContentSign(token, 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
      stubServices({ getSignatureInfo: jest.fn().mockRejectedValue(new Error('down')) });
      await expect(svc.checkRandomContentSign(token, 'sig')).rejects.toThrow(Errors.List.INVALID_TOKEN.message);
    });

    it('getSignatureInfoX509 maps every failure to INCORRECT_SIGN', async () => {
      const svc = make();
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info('t')) });
      await expect(svc.getSignatureInfoX509('s')).resolves.toMatchObject({ serial: 'S1' });
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info('t', { pem: undefined })) });
      await expect(svc.getSignatureInfoX509('s')).rejects.toThrow(Errors.List.INCORRECT_SIGN.message);
      stubServices({ getSignatureInfo: jest.fn().mockResolvedValue(info('t', { content: undefined })) });
      await expect(svc.getSignatureInfoX509('s')).rejects.toThrow(Errors.List.INCORRECT_SIGN.message);
    });

    it('decodeSignature requires enabled encryption and decrypts', () => {
      expect(() => make({ encryption: undefined }).decodeSignature('x')).toThrow('Encryption is not enabled');
      expect(make({ encryption }).decodeSignature(encrypt('SIGNED'))).toBe('SIGNED');
    });

    it('checkRandomContentSign decrypts and converts signature when encryption is enabled', async () => {
      const svc = make({ encryption });
      const token = await svc.getRandomContentToSign();
      const hashToInternalSignature = jest.fn().mockResolvedValue('INTERNAL');
      const getSignatureInfo = jest.fn().mockResolvedValue(info(token));
      stubServices({ hashToInternalSignature, getSignatureInfo });
      await expect(svc.checkRandomContentSign(token, encrypt('SIGNED'))).resolves.toMatchObject({ serial: 'S1' });
      expect(hashToInternalSignature).toHaveBeenCalledWith('SIGNED', token);
      expect(getSignatureInfo).toHaveBeenCalledWith('INTERNAL');
    });

    it('checkRandomContentSign keeps the raw signature when decryption fails, rejects non-string conversion', async () => {
      const svc = make({ encryption });
      const token = await svc.getRandomContentToSign();
      const getSignatureInfo = jest.fn().mockResolvedValue(info(token));
      stubServices({ getSignatureInfo });
      await expect(svc.checkRandomContentSign(token, 'garbage')).resolves.toMatchObject({ serial: 'S1' });
      expect(getSignatureInfo).toHaveBeenCalledWith('garbage');

      const token2 = await svc.getRandomContentToSign();
      stubServices({ hashToInternalSignature: jest.fn().mockResolvedValue(undefined), getSignatureInfo });
      await expect(svc.checkRandomContentSign(token2, encrypt('SIGNED'))).rejects.toThrow(Errors.List.SIGNATURE_NOT_FOUND.message);
    });

    it('identification helpers', () => {
      const svc = make();
      expect(svc.isLegal({ EDRPOU: '12345678' })).toBe(true);
      expect(svc.isLegal({ EDRPOU: '1234567890' })).toBe(false);
      expect(svc.isLegal({ EDRPOU: '' })).toBe(false);
      expect(svc.isIndividualEntrepreneur({ EDRPOU: '1234567890', DRFO: '' })).toBe(true);
      expect(svc.isIndividualEntrepreneur({ EDRPOU: '1234567890', DRFO: '1234567890' })).toBe(true);
      expect(svc.isIndividualEntrepreneur({ EDRPOU: '1234567890', DRFO: '0987654321' })).toBe(false);
      expect(svc.isIndividualEntrepreneur({ EDRPOU: '12345678', DRFO: '' })).toBe(false);
      expect(svc.getUserIdentificationType({ EDRPOU: '12345678', DRFO: '' })).toBe('edrpou');
      expect(svc.getUserIdentificationType({ EDRPOU: '', DRFO: '1234567890' })).toBe('ipn');
      expect(svc.getUserIdentificationType({ EDRPOU: '', DRFO: 'AB123456' })).toBe('passport');
      expect(svc.getUserIdentificationType({ EDRPOU: '', DRFO: '123456789' })).toBe('idCard');
      expect(svc.getUserIdentificationType({ EDRPOU: '', DRFO: 'zz' })).toBeUndefined();
    });

    it('getEdsServersListFromEdsService returns an empty list', async () => {
      await expect(make().getEdsServersListFromEdsService()).resolves.toEqual([]);
    });

    it('exitApp exits and schedules SIGTERM', async () => {
      jest.useFakeTimers();
      const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
      const kill = jest.spyOn(process, 'kill').mockImplementation((() => true) as any);
      try {
        await make().exitApp();
        await Promise.resolve();
        expect(exit).toHaveBeenCalledWith(1);
        expect(kill).not.toHaveBeenCalled();
        jest.advanceTimersByTime(5000);
        expect(kill).toHaveBeenCalledWith(process.pid, 'SIGTERM');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
