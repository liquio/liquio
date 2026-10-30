import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import express from 'express';
import moment from 'moment';

import { TestApp } from './test-app';
import { Cors } from '../src/lib/cors';
import { Helpers } from '../src/lib/helpers';
import { Stream } from '../src/lib/stream';
import { HttpRequest } from '../src/lib/http_request';
import { SystemNotifier } from '../src/lib/system_notifier';
import { beautifyJSON } from '../src/lib/beautifyJSON';
import { parseJSONCSchema, validateJSONCSchema } from '../src/lib/jsonc_helper';
import { XmlJsConverter } from '../src/lib/xml_js_converter';
import { Db } from '../src/lib/db';
import { TestUserChecker } from '../src/lib/test_user_checker';
import {
  assertNoPlaceholderSecrets,
  assertTaskTokenIsNotDefault,
  findPlaceholderSecrets,
  findPlaceholderSecretWarnings,
  KNOWN_DEFAULT_TASK_TOKEN_HASHES,
} from '../src/lib/config_check';
import { getInternalHttpsAgent, getPlainHttpInternalUrls, warnPlainHttpInternalUrls } from '../src/lib/internal_transport';
import * as errors from '../src/lib/errors';
import { HttpClient } from '../src/lib/http_client';
import { buildSandboxConfig } from '../src/lib/sandbox_config';
import { getConfig, getDb } from '../src/lib/context';

const NOTIFIER = 'http://notification:8080';

describe('Library modules', () => {
  let app: TestApp;

  beforeAll(async () => {
    await TestApp.beforeAll();
    app = await TestApp.setup();
  });

  afterAll(async () => {
    await app?.destroy();
    await TestApp.afterAll();
  });

  beforeEach(async () => {
    await TestApp.beforeEach();
  });

  afterEach(async () => {
    await TestApp.afterEach();
  });

  describe('config checks', () => {
    const goodConfig = () => ({
      server: { token: 'server-token', environment: 'production', crypto: { password: 'p', iv: 'i' } },
      notifier: { password: 'secret' },
      db: { password: 'secret' },
      auth: { jwtSecret: 'secret', basicAuthToken: 'secret', clientSecret: 'secret' },
      sign: { token: 'secret' },
      task: { token: 'Basic dGVzdDp0ZXN0' },
    });

    it('accepts a config without placeholder secrets', () => {
      expect(findPlaceholderSecrets(goodConfig())).toEqual([]);
      expect(findPlaceholderSecretWarnings(goodConfig())).toEqual([]);
      expect(assertNoPlaceholderSecrets(goodConfig())).toEqual([]);
    });

    it('rejects placeholder secrets outside of dev and tolerates them in dev', () => {
      const config: any = goodConfig();
      config.db.password = '<REDACTED>';
      config.auth.jwtSecret = '';
      expect(() => assertNoPlaceholderSecrets(config)).toThrow(/db\.password/);
      config.server.environment = 'dev';
      expect(assertNoPlaceholderSecrets(config)).toEqual(expect.arrayContaining(['db.password', 'auth.jwtSecret']));
    });

    it('checks the slave database password and warns about optional secrets', () => {
      const config: any = goodConfig();
      config.db.slave = { password: '<REDACTED>' };
      config.auth.clientSecret = '<REDACTED>';
      expect(findPlaceholderSecrets(config)).toContain('db.slave.password');
      expect(findPlaceholderSecretWarnings(config)).toEqual(['auth.clientSecret']);
    });

    it('refuses the task token that is a publicly known default', () => {
      expect(KNOWN_DEFAULT_TASK_TOKEN_HASHES.length).toBeGreaterThan(0);
      expect(() => assertTaskTokenIsNotDefault({ task: { token: 'Basic dGVzdDp0ZXN0' }, server: { environment: 'production' } })).not.toThrow();
      expect(() => assertTaskTokenIsNotDefault({ task: { token: '' }, server: { environment: 'production' } })).toThrow(/task\.token/);
      expect(() => assertTaskTokenIsNotDefault({ task: { token: '' }, server: { environment: 'dev' } })).not.toThrow();
      expect(() => assertTaskTokenIsNotDefault({} as any)).toThrow();
    });
  });

  describe('internal transport', () => {
    it('does not create an agent without TLS settings', () => {
      expect(getInternalHttpsAgent({})).toBeUndefined();
      expect(getInternalHttpsAgent({ internal_transport: {} })).toBeUndefined();
      expect(getInternalHttpsAgent({ internal_transport: { ca: [] } })).toBeUndefined();
    });

    it('creates a cached agent from inline PEM and file based settings', () => {
      const file = path.join(os.tmpdir(), `admin-api-lib-test-${process.pid}.pem`);
      fs.writeFileSync(file, '-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----\n');
      try {
        const config = { internal_transport: { ca: file, cert: file, key: file } };
        const agent = getInternalHttpsAgent(config);
        expect(agent).toBeDefined();
        expect(getInternalHttpsAgent(config)).toBe(agent);

        const inline = getInternalHttpsAgent({
          internal_transport: { ca: ['-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----'] },
        });
        expect(inline).toBeDefined();
      } finally {
        fs.rmSync(file, { force: true });
      }
    });

    it('lists and warns about plain http internal URLs in production only', () => {
      const config = {
        notifier: { server: 'http://notifier' },
        sign: { url: 'https://sign' },
        system_notifier: { email: { server: ' HTTP://mail ' } },
      };
      expect(Object.keys(getPlainHttpInternalUrls(config))).toEqual(['notifier.server', 'system_notifier.email.server']);
      expect(warnPlainHttpInternalUrls(config, 'development')).toEqual([]);
      expect(warnPlainHttpInternalUrls(config, undefined)).toEqual([]);
      expect(warnPlainHttpInternalUrls({ ...config, internal_transport: { allowPlainHttp: true } }, 'production')).toEqual([]);
      expect(warnPlainHttpInternalUrls(config, 'production')).toEqual(['notifier.server', 'system_notifier.email.server']);
      expect(warnPlainHttpInternalUrls({ sign: { url: 'https://sign' } }, 'production')).toEqual([]);
    });
  });

  describe('errors', () => {
    it('carries HTTP status codes', () => {
      const expected: [new (...args: any[]) => Error, number][] = [
        [errors.ErrorWithHttpStatusCode, 500],
        [errors.UnauthorizedError, 401],
        [errors.NotFoundError, 404],
        [errors.InternalServerError, 500],
        [errors.InvalidParamsError, 400],
        [errors.InvalidSchemaError, 400],
        [errors.EvaluateSchemaFunctionError, 500],
        [errors.HTTPRequestError, 502],
        [errors.HTTPResponseError, 502],
        [errors.BadRequestError, 400],
        [errors.ForbiddenError, 403],
      ];
      for (const [ErrorClass, status] of expected) {
        const error: any = new ErrorClass('message');
        expect(error.httpStatusCode).toBe(status);
        expect(error.message).toBe('message');
        expect(error).toBeInstanceOf(Error);
      }
      expect(new errors.SequelizeDbError('db').cause).toBe('db');
      expect(new errors.SequelizeUniqueConstraintError('unique').httpStatusCode).toBe(500);
    });
  });

  describe('small helpers', () => {
    it('allows cross-origin requests', async () => {
      const server = express();
      Cors.allow(server);
      server.get('/ping', (req, res) => res.send('pong'));
      const response = await (await import('supertest')).default(server).get('/ping').expect(200);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    it('transforms functions to async when they call allowed async functions', () => {
      expect(Helpers.transformFunctionToAsync('() => 1', ['load'])).toBe('() => 1');
      expect(Helpers.transformFunctionToAsync('() => await load()', ['load'])).toBe('() => await load()');
      expect(Helpers.transformFunctionToAsync('() => load()', ['load'])).toBe('async () => await load()');
      expect(Helpers.transformFunctionToAsync('async () => load()', ['load'])).toBe('async () => await load()');
    });

    it('reads streams', async () => {
      const content = await Stream.getFileContent(Readable.from(['a', 'b', 'c']));
      expect(content).toBe('abc');
      await expect(
        Stream.waitEvent(
          {
            on: () => {
              throw new Error('broken');
            },
          },
          'end',
        ),
      ).rejects.toThrow('broken');
    });

    it('beautifies JSON strings only when it is safe', () => {
      expect(beautifyJSON('{"a":1}')).toBe('{\n    "a": 1\n}');
      expect(beautifyJSON('{"a":\n1}')).toBe('{"a":\n1}');
      expect(beautifyJSON('not json')).toBe('not json');
      expect(beautifyJSON(5 as any)).toBe(5);
    });

    it('validates and parses JSON with comments', () => {
      expect(() => validateJSONCSchema('{"a": 1, /* c */ "b": [1,],}')).not.toThrow();
      expect(() => validateJSONCSchema('{"a": ')).toThrow(/Invalid JSON schema/);
      expect(parseJSONCSchema('{"a": 1, // c\n}')).toEqual({ a: 1 });
    });

    it('converts XML and JSON', async () => {
      const converter = new XmlJsConverter();
      const object: any = await converter.convertXmlToJsObject('<root><item id="1">x</item></root>');
      expect(object.root.item[0]._).toBe('x');
      expect(JSON.parse(await converter.convertXmlToJsonString('<root/>', 0))).toEqual({ root: '' });
      expect(await converter.convertJsonToXmlString({ root: { a: 'b' } })).toContain('<a>b</a>');
      await expect(converter.convertXmlToJsObject('<root>')).rejects.toBeDefined();
    });

    it('builds the sandbox config with defaults', () => {
      expect(buildSandboxConfig(undefined)).toBeDefined();
      expect(buildSandboxConfig({ memoryLimit: 8 } as any)).toBeDefined();
    });
  });

  describe('HttpRequest', () => {
    it('sends JSON and plain bodies and returns parsed bodies', async () => {
      app.nock(NOTIFIER).post('/echo', { a: 1 }).reply(200, { ok: true });
      expect(await HttpRequest.send({ url: `${NOTIFIER}/echo`, method: HttpRequest.Methods.POST, body: JSON.stringify({ a: 1 }) })).toEqual({
        ok: true,
      });

      app.nock(NOTIFIER).post('/plain', 'raw text').reply(200, 'text response');
      expect(await HttpRequest.send({ url: `${NOTIFIER}/plain`, method: HttpRequest.Methods.POST, body: 'raw text' })).toBe('text response');

      app.nock(NOTIFIER).get('/text').reply(200, '{"parsed":true}', { 'content-type': 'text/plain' });
      expect(await HttpRequest.send({ url: `${NOTIFIER}/text`, method: HttpRequest.Methods.GET })).toEqual({ parsed: true });
    });

    it('returns the full response when requested and does not throw on HTTP errors', async () => {
      app.nock(NOTIFIER).get('/missing').reply(404, { error: 'missing' });
      const full: any = await HttpRequest.send({ url: `${NOTIFIER}/missing`, method: HttpRequest.Methods.GET, headers: { a: 'b' } }, true);
      expect(full.response.status).toBe(404);
      expect(full.body).toEqual({ error: 'missing' });
    });

    it('throws a clean error on network failures', async () => {
      app.nock(NOTIFIER).get('/down').replyWithError('socket hang up');
      await expect(HttpRequest.send({ url: `${NOTIFIER}/down`, method: HttpRequest.Methods.GET })).rejects.toThrow('socket hang up');
    });

    it('exposes constants and body parsers', () => {
      expect(HttpRequest.ContentTypes.CONTENT_TYPE_JSON).toBe('application/json');
      expect(HttpRequest.Accepts.ACCEPT_JSON).toBe('application/json');
      const server = express();
      HttpRequest.parseBodyJson(server);
      HttpRequest.parseBodyUrlencoded(server);
    });
  });

  describe('HttpClient', () => {
    it('performs requests and reports HTTP errors', async () => {
      const client = new HttpClient({ requestTimeout: 5000 });
      app.nock(NOTIFIER).get('/ok').reply(200, { fine: true });
      const response = await client.request(`${NOTIFIER}/ok`, { method: 'GET' }, 'test-ok');
      expect(await response.json()).toEqual({ fine: true });

      app.nock(NOTIFIER).get('/bad').reply(500, 'oops');
      await expect(client.request(`${NOTIFIER}/bad`, { method: 'GET' }, 'test-bad')).rejects.toMatchObject({ httpStatusCode: 502 });

      app.nock(NOTIFIER).get('/tolerated').reply(404, 'nope');
      const tolerated = await client.request(`${NOTIFIER}/tolerated`, { method: 'GET' }, 'test-tolerated', { isDoNotCheckHTTPErrorCode: true });
      expect(tolerated.status).toBe(404);

      app.nock(NOTIFIER).get('/network').replyWithError('connection reset');
      await expect(client.request(`${NOTIFIER}/network`, { method: 'GET' }, 'test-network')).rejects.toBeDefined();
    });
  });

  describe('SystemNotifier', () => {
    it('sends emails about a workflow and reports failures', async () => {
      getConfig().system_notifier = {
        adminUrl: 'http://admin.local',
        email: {
          server: 'http://notification',
          port: 8080,
          routes: { sendEmail: '/message/emailsList' },
          timeout: 1000,
          user: 'admin-api',
          password: 'test-password',
          emails: ['ops@example.com'],
          subject: 'Workflow error',
          body: 'See {url}',
        },
      };
      (SystemNotifier as any).singleton = undefined;
      const notifier = new SystemNotifier();

      app.nock(NOTIFIER).post('/message/emailsList').reply(200, { sent: true });
      const result = await notifier.sendEmails('workflow-1');
      expect(result.data.full_message).toBe('See http://admin.local/process/workflow-1');
      expect(result.response).toEqual({ sent: true });

      app.nock(NOTIFIER).post('/message/emailsList').replyWithError('mail down');
      await expect(notifier.sendEmails('workflow-2')).rejects.toThrow('mail down');
    });
  });

  describe('Db', () => {
    it('computes the timezone offset and reuses the singleton', async () => {
      expect(Db.tz).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(Db.tz).toBe(Db.tz);
      expect(() => new (Db as any)()).toThrow('Constructor is private.');
      expect(await Db.getInstance(getConfig().db)).toBe(getDb());
    });

    it('fails to connect with a wrong configuration', async () => {
      await expect(Db.getInstance({ ...getConfig().db, host: '127.0.0.1', port: 1, retry: { max: 0 } }, true)).rejects.toBeDefined();
    });
  });

  describe('TestUserChecker', () => {
    const checker = new TestUserChecker();
    const validIpn = () => {
      // Build an IPN of a person born about 30 years ago with a valid check digit.
      const days = moment().subtract(30, 'years').diff(moment('1899-12-31'), 'days');
      const base = String(days).padStart(5, '0') + '1234';
      const weights = [-1, 5, 7, 9, 4, 6, 10, 5, 7];
      const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0);
      const digit = (sum % 11) % 10;
      return `${base}${digit}`;
    };

    it('validates IPN checksum and age', () => {
      expect(checker.validateIpn(validIpn())).toBe(true);
      expect(checker.validateIpn('123')).toBe(false);
      expect(checker.validateIpn('1234567890', false)).toBe(false);
      const tooOld = String(moment('1899-12-31').add(5, 'days').diff(moment('1899-12-31'), 'days')).padStart(5, '0') + '1234';
      const weights = [-1, 5, 7, 9, 4, 6, 10, 5, 7];
      const digit = (weights.reduce((total, weight, index) => total + Number(tooOld[index]) * weight, 0) % 11) % 10;
      expect(checker.validateIpn(`${tooOld}${digit}`)).toBe(false);
    });

    it('recognizes test users by IPN, name and issuer', () => {
      const ipn = validIpn();
      expect(checker.isTestUser({ ipn: '1', name: 'Anyone', services: {} })).toBe(true);
      expect(checker.isTestUser({ ipn, name: 'Test User', services: {} })).toBe(true);
      expect(checker.isTestUser({ ipn, name: 'Real Person', services: {} })).toBe(false);
      expect(checker.isTestUser({ ipn, name: 'Real Person', services: { eds: { data: { issuerInfo: { commonName: 'Test CA' } } } } })).toBe(true);
      expect(checker.isTestUser({ ipn, name: 'Real Person', services: { eds: { data: { issuerInfo: { commonName: 'Real CA' } } } } })).toBe(false);
      expect(checker.isTestUser({ ipn, name: 'Real Person', services: { local: { provider_id: 'test-provider' } } })).toBe(true);
      expect(checker.isTestUser({ ipn, name: 'Real Person', services: { govid: {} } })).toBe(false);
    });
  });
});
