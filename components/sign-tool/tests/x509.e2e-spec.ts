import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

import { createE2eApp, pinClock } from './helpers/create-app';

const mocks = path.join(__dirname, '..', 'src', 'x509', '__mocks__');
const sample1 = fs.readFileSync(path.join(mocks, 'sample-1.json'));
const sign1 = fs.readFileSync(path.join(mocks, 'sample-1.json.p7s')).toString('base64');
const sign2 = fs.readFileSync(path.join(mocks, 'sample-2.json.p7s')).toString('base64');

describe('x509 (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createE2eApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => pinClock());
  afterEach(() => jest.useRealTimers());

  describe('POST /x509/signature-info', () => {
    it('returns signature info for a trusted signature', async () => {
      const res = await http().post('/x509/signature-info').send({ sign: sign1 }).expect(201);
      expect(res.body.subject.commonName).toBe('Anna Kowalski');
      expect(res.body.issuer.commonName).toBe('Liquio Test CA');
      expect(res.body.serial).toBe('1DD5E3F086BA70CFE146B5B76F56BA03730FBECC');
      expect(res.body.signTime).toBeDefined();
      expect(res.body.pem).toContain('BEGIN CERTIFICATE');
    });

    it('returns the embedded content (attached signature)', async () => {
      const res = await http().post('/x509/signature-info').send({ sign: sign1 }).expect(201);
      expect(res.body.content).toBe(sample1.toString('base64'));
    });

    it('accepts the {sign, content} variant', async () => {
      const res = await http()
        .post('/x509/signature-info')
        .send({ sign: sign1, content: sample1.toString('base64') })
        .expect(201);
      expect(res.body.subject.commonName).toBe('Anna Kowalski');
    });

    it('returns 400 when sign is missing', async () => {
      const res = await http().post('/x509/signature-info').send({}).expect(400);
      expect(res.body.message).toBe('Sign is required');
    });

    it('returns 400 for invalid signature data', async () => {
      const res = await http().post('/x509/signature-info').send({ sign: 'bm90LWEtc2lnbmF0dXJl' }).expect(400);
      expect(res.body.message).toBe('Invalid signature data');
    });

    it('returns 400 for a signature from an untrusted CA', async () => {
      await http().post('/x509/signature-info').send({ sign: sign2 }).expect(400);
    });

    it('returns 400 for an expired certificate (real clock)', async () => {
      jest.useRealTimers();
      await http().post('/x509/signature-info').send({ sign: sign1 }).expect(400);
    });
  });

  describe('POST /x509/verify-hash', () => {
    it('returns true for the correct hash', async () => {
      const hash = crypto.createHash('sha256').update(sample1).digest('base64');
      const res = await http().post('/x509/verify-hash').send({ hash, sign: sign1 }).expect(201);
      expect(res.body).toEqual({ result: true });
    });

    it('returns false for a wrong hash', async () => {
      const hash = crypto.createHash('sha256').update('other').digest('base64');
      const res = await http().post('/x509/verify-hash').send({ hash, sign: sign1 }).expect(201);
      expect(res.body).toEqual({ result: false });
    });

    it('returns false for a garbage signature', async () => {
      const res = await http().post('/x509/verify-hash').send({ hash: 'aGFzaA==', sign: 'garbage' }).expect(201);
      expect(res.body).toEqual({ result: false });
    });
  });

  describe('POST /x509/hash-data', () => {
    const data = Buffer.from('hello world');

    it('returns a hex hash by default', async () => {
      const res = await http()
        .post('/x509/hash-data')
        .send({ data: data.toString('base64') })
        .expect(201);
      expect(res.text).toBe(crypto.createHash('sha256').update(data).digest('hex'));
    });

    it('returns a base64 hash when requested', async () => {
      const res = await http()
        .post('/x509/hash-data')
        .send({ data: data.toString('base64'), isReturnAsBase64: true })
        .expect(201);
      expect(res.text).toBe(crypto.createHash('sha256').update(data).digest('base64'));
    });

    it('returns 400 for invalid base64', async () => {
      const res = await http().post('/x509/hash-data').send({ data: '%%%' }).expect(400);
      expect(res.body.message).toBe('Invalid data, expected base64-encoded string');
    });

    it('returns 400 when data is missing', async () => {
      const res = await http().post('/x509/hash-data').send({}).expect(400);
      expect(res.body.message).toBe('Data is required');
    });
  });

  describe('POST /x509/hash-to-internal-signature', () => {
    it('returns a CMS ContentInfo', async () => {
      const res = await http()
        .post('/x509/hash-to-internal-signature')
        .send({ hash: sign1, content: sample1.toString('base64') });
      expect(res.status).toBe(201);
      const der = Buffer.from(res.text, 'base64');
      const asn1 = asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength));
      const info = new pkijs.ContentInfo({ schema: asn1.result });
      expect(info.contentType).toBe('1.2.840.113549.1.7.2');
    });

    it('returns 400 when hash is missing', async () => {
      const res = await http().post('/x509/hash-to-internal-signature').send({ content: 'dGVzdA==' }).expect(400);
      expect(res.body.message).toBe('Hash is required');
    });

    it('returns 400 when content is missing', async () => {
      const res = await http().post('/x509/hash-to-internal-signature').send({ hash: 'dGVzdA==' }).expect(400);
      expect(res.body.message).toBe('Invalid hash or content data');
    });
  });
});
