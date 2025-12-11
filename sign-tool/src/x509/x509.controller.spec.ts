import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';
import { OID_PKCS7_SIGNED_DATA } from './x509.constants';
import { Crypto } from '@peculiar/webcrypto';

import { X509Controller } from './x509.controller';
import { X509Service } from './x509.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { LoggerService } from '../observability/logger.service';

const webcrypto = new Crypto();
const engine = new pkijs.CryptoEngine({
  name: 'testEngine',
  crypto: webcrypto,
  subtle: webcrypto.subtle,
});
pkijs.setEngine('testEngine', engine);

const caCertPath = path.join(__dirname, '__mocks__', 'ca-1.cert.pem');
let caCertPem: string = fs.readFileSync(caCertPath, 'utf8');
class MockConfigurationService {
  get(key: string) {
    if (key === 'x509') {
      return { caCerts: [caCertPem] };
    }
    return undefined;
  }
}

class MockLoggerService {
  setContext = jest.fn();
  error = jest.fn();
  log = jest.fn();
}

describe('X509Controller', () => {
  let app: INestApplication;
  let x509Service: X509Service;
  let sampleP7sDer: Buffer;
  let sampleP7sB64: string;
  let sampleJson: Buffer;
  let sampleJsonB64: string;

  beforeAll(() => {
    const sigPath = path.join(__dirname, '__mocks__', 'sample-1.json.p7s');
    sampleP7sDer = fs.readFileSync(sigPath);
    sampleP7sB64 = sampleP7sDer.toString('base64');
    const sampleJsonPath = path.join(__dirname, '__mocks__', 'sample-1.json');
    sampleJson = fs.readFileSync(sampleJsonPath);
    sampleJsonB64 = Buffer.from(sampleJson).toString('base64');
    const caCertPath = path.join(__dirname, '__mocks__', 'ca-1.cert.pem');
    caCertPem = fs.readFileSync(caCertPath, 'utf8');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [X509Controller],
      providers: [
        X509Service,
        { provide: ConfigurationService, useClass: MockConfigurationService },
        { provide: LoggerService, useClass: MockLoggerService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    x509Service = module.get<X509Service>(X509Service);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    const controller = app.get(X509Controller);
    expect(controller).toBeDefined();
  });

  describe('POST /x509/signature-info', () => {
    it('should return signature info (201)', async () => {
      // Use a real signature from __mocks__
      const payload = { sign: sampleP7sB64 };
      await request(app.getHttpServer())
        .post('/x509/signature-info')
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(res.body.subject.commonName).toBe('Anna Kowalski');
          expect(res.body.subject.organizationName).toBe('Liquio Test');
          expect(res.body.subject.countryName).toBe('UA');
          expect(res.body.subject.serialNumber).toBe('AB123456789UA');
          expect(res.body.issuer.commonName).toBe('Liquio Test CA');
          expect(res.body.issuer.organizationName).toBe('Liquio Test CA');
          expect(res.body.issuer.countryName).toBe('UA');
          expect(res.body.serial).toBe(
            '1DD5E3F086BA70CFE146B5B76F56BA03730FBECC',
          );
          expect(res.body.pem).toContain('BEGIN CERTIFICATE');
        });
    });

    it('should return 400 if sign is missing', async () => {
      await request(app.getHttpServer())
        .post('/x509/signature-info')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Sign is required');
        });
    });
  });

  describe('POST /x509/verify-hash', () => {
    it('should return true (201) when signature is valid', async () => {
      // Compute the hash of the extracted content (base64-encoded SHA-256)
      const der = sampleP7sDer.buffer.slice(
        sampleP7sDer.byteOffset,
        sampleP7sDer.byteOffset + sampleP7sDer.byteLength,
      ) as ArrayBuffer;
      const asn1 = asn1js.fromBER(der);
      const contentInfo = new pkijs.ContentInfo({ schema: asn1.result });
      const signedData = new pkijs.SignedData({ schema: contentInfo.content });

      // Check if content is embedded or we need to use the original JSON file
      let contentBuffer: Buffer;
      if (
        signedData.encapContentInfo.eContent &&
        signedData.encapContentInfo.eContent.valueBlock
      ) {
        contentBuffer = Buffer.from(
          signedData.encapContentInfo.eContent.valueBlock.valueHex,
        );
      } else {
        // Use the original JSON content
        contentBuffer = sampleJson;
      }

      const expectedHash = crypto
        .createHash('sha256')
        .update(contentBuffer)
        .digest('base64');
      const payload = { hash: expectedHash, sign: sampleP7sB64 };
      await request(app.getHttpServer())
        .post('/x509/verify-hash')
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ result: true });
        });
    });

    it('should return 400 if hash is missing', async () => {
      await request(app.getHttpServer())
        .post('/x509/verify-hash')
        .send({ sign: 'dummy' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ result: false });
        });
    });

    it('should return 400 if service throws', async () => {
      // Use an invalid base64 signature to trigger service error
      await request(app.getHttpServer())
        .post('/x509/verify-hash')
        .send({ hash: 'aGFzaA==', sign: 'not-a-valid-base64' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ result: false });
        });
    });
  });

  describe('POST /x509/hash-data', () => {
    it('should return hash (201)', async () => {
      // Use real data
      const payload = {
        data: Buffer.from('test').toString('base64'),
        isReturnAsBase64: true,
      };
      const expectedHash = crypto
        .createHash('sha256')
        .update('test')
        .digest('base64');
      await request(app.getHttpServer())
        .post('/x509/hash-data')
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(res.text).toBe(expectedHash);
        });
    });

    it('should return 400 if data is missing', async () => {
      await request(app.getHttpServer())
        .post('/x509/hash-data')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Data is required');
        });
    });

    it('should return 400 if data is not valid base64', async () => {
      await request(app.getHttpServer())
        .post('/x509/hash-data')
        .send({ data: 'not-base64', isReturnAsBase64: true })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Invalid data, expected base64-encoded string',
          );
        });
    });
  });

  describe('POST /x509/hash-to-internal-signature', () => {
    it('should return signature (201)', async () => {
      // Use a real detached signature and content
      const parsedSample = await x509Service.parseSignature(sampleP7sB64);
      const detachedSignedData = new pkijs.SignedData({
        certificates: parsedSample.certificates,
        signerInfos: parsedSample.signerInfos,
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: parsedSample.encapContentInfo.eContentType,
        }),
      });
      detachedSignedData.encapContentInfo.eContent = undefined;
      const detachedContentInfo = new pkijs.ContentInfo({
        contentType: OID_PKCS7_SIGNED_DATA,
        content: detachedSignedData.toSchema(),
      });
      const detachedDer = detachedContentInfo.toSchema().toBER(false);
      const detachedB64 = Buffer.from(detachedDer).toString('base64');
      const payload = { hash: detachedB64, content: sampleJsonB64 };
      await request(app.getHttpServer())
        .post('/x509/hash-to-internal-signature')
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(typeof res.text).toBe('string');
          expect(res.text.length).toBeGreaterThan(0);
        });
    });

    it('should return 400 if hash is missing', async () => {
      await request(app.getHttpServer())
        .post('/x509/hash-to-internal-signature')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Hash is required');
        });
    });

    it('should return 400 if service throws', async () => {
      // Use an invalid base64 hash to trigger service error
      await request(app.getHttpServer())
        .post('/x509/hash-to-internal-signature')
        .send({ hash: 'not-base64', content: 'dGVzdA==' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid hash or content data');
        });
    });
  });

  describe('CA trust boundaries', () => {
    it('should accept anna-kowalski (signed by ca-1)', async () => {
      const sigPath = path.join(__dirname, '__mocks__', 'sample-1.json.p7s');
      const sigDer = fs.readFileSync(sigPath);
      const sigB64 = sigDer.toString('base64');
      const payload = { sign: sigB64 };
      await request(app.getHttpServer())
        .post('/x509/signature-info')
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(res.body.subject.commonName).toBe('Anna Kowalski');
        });
    });

    it('should reject elena-petrov (signed by ca-2)', async () => {
      const sigPath = path.join(__dirname, '__mocks__', 'sample-2.json.p7s');
      const sigDer = fs.readFileSync(sigPath);
      const sigB64 = sigDer.toString('base64');
      const payload = { sign: sigB64 };
      await request(app.getHttpServer())
        .post('/x509/signature-info')
        .send(payload)
        .expect(400);
    });
  });
});
