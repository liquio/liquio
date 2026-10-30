import { AsyncLocalStorage } from 'async_hooks';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import * as pkijs from 'pkijs';
import { Test, TestingModule } from '@nestjs/testing';
import { Crypto } from '@peculiar/webcrypto';
import * as asn1js from 'asn1js';
import debug from 'debug';

import { X509Service } from './x509.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { LoggerService } from '../observability/logger.service';
import { OID_COMMON_NAME, OID_ORGANIZATION_NAME, OID_COUNTRY_NAME, OID_BASIC_CONSTRAINTS, OID_PKCS7_SIGNED_DATA } from './x509.constants';

let ca1CertPem: string;
let sample1P7sDer: Buffer;
let sample1P7sB64: string;
let sample1Json: Buffer;
let testPersonCrtPem: string;
let testPersonCrtB64: string;

class MockConfigurationService {
  get(key: string) {
    if (key === 'x509') {
      return { caCerts: [ca1CertPem] };
    }
    return undefined;
  }
}

@Injectable()
class MockLoggerService extends LoggerService {
  constructor() {
    super(new AsyncLocalStorage());
  }

  printMessages = debug('test:log');
}

beforeAll(() => {
  const webcrypto = new Crypto();
  const engine = new pkijs.CryptoEngine({
    name: 'testEngine',
    crypto: webcrypto,
    subtle: webcrypto.subtle,
  });
  pkijs.setEngine('testEngine', engine);

  {
    const sigPath = path.join(__dirname, '__mocks__', 'sample-1.json.p7s');
    sample1P7sDer = fs.readFileSync(sigPath);
    sample1P7sB64 = sample1P7sDer.toString('base64');
  }
  {
    const sample1JsonPath = path.join(__dirname, '__mocks__', 'sample-1.json');
    sample1Json = fs.readFileSync(sample1JsonPath);
  }
  {
    const certPath = path.join(__dirname, '__mocks__', 'test-person-1.cert.pem');
    testPersonCrtPem = fs.readFileSync(certPath, 'utf8');
    testPersonCrtB64 = testPersonCrtPem.replace(/-----[^-]+-----|\s+/g, '');
  }
  {
    const caCertPath = path.join(__dirname, '__mocks__', 'ca-1.cert.pem');
    ca1CertPem = fs.readFileSync(caCertPath, 'utf8');
  }
});

// Fixture certificates (test-person-*) expired on 2026-07-21, so tests pin the clock inside their validity period.
const FIXTURE_NOW = new Date('2026-01-01T00:00:00Z');
const fakeNow = (now: Date) =>
  jest.useFakeTimers({
    now,
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'performance',
      'hrtime',
    ],
  });

describe('X509Service', () => {
  let service: X509Service;

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    fakeNow(FIXTURE_NOW);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        X509Service,
        { provide: ConfigurationService, useClass: MockConfigurationService },
        { provide: LoggerService, useClass: MockLoggerService },
      ],
    }).compile();
    service = module.get<X509Service>(X509Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseSignature', () => {
    it('should parse signature', async () => {
      const signedData = await service.parseSignature(sample1P7sB64);
      const cert = signedData.certificates
        .filter((c) => c instanceof pkijs.Certificate)
        .find((c) => {
          const ext = c.extensions?.find((e) => e.extnID === OID_BASIC_CONSTRAINTS);
          if (ext && ext.parsedValue) return !ext.parsedValue.cA;
          return c.subject.typesAndValues.some((tv) => tv.type === OID_COMMON_NAME && tv.value.valueBlock.value === 'Test Person');
        }) as pkijs.Certificate;
      expect(cert).toBeInstanceOf(pkijs.Certificate);
      const subject = cert.subject.typesAndValues.reduce(
        (acc, tv) => {
          acc[tv.type] = tv.value.valueBlock.value;
          return acc;
        },
        {} as Record<string, string>,
      );
      expect(subject[OID_COMMON_NAME]).toBe('Anna Kowalski');
      expect(subject[OID_ORGANIZATION_NAME]).toBe('Liquio Test');
      expect(subject[OID_COUNTRY_NAME]).toBe('UA');
      const issuer = cert.issuer.typesAndValues.reduce(
        (acc, tv) => {
          acc[tv.type] = tv.value.valueBlock.value;
          return acc;
        },
        {} as Record<string, string>,
      );
      expect(issuer[OID_COMMON_NAME]).toBe('Liquio Test CA');
      expect(issuer[OID_ORGANIZATION_NAME]).toBe('Liquio Test CA');
      expect(issuer[OID_COUNTRY_NAME]).toBe('UA');
      const serialHex = Buffer.from(cert.serialNumber.valueBlock.toBER()).toString('hex').toUpperCase();
      expect(serialHex).toBe('1DD5E3F086BA70CFE146B5B76F56BA03730FBECC');
      expect(signedData.signerInfos.length).toBeGreaterThan(0);
    });

    it('should throw on invalid base64', async () => {
      await expect(service.parseSignature('not-a-valid-base64')).rejects.toThrow('Failed to parse signature');
    });

    it('should throw on invalid ASN.1', async () => {
      const badB64 = Buffer.from('hello world').toString('base64');
      await expect(service.parseSignature(badB64)).rejects.toThrow('Failed to parse signature');
    });

    it('should throw if not a PKCS#7 SignedData structure', async () => {
      await expect(service.parseSignature(testPersonCrtB64)).rejects.toThrow('Failed to parse signature');
    });

    it('should throw if signature is empty', async () => {
      await expect(service.parseSignature('')).rejects.toThrow('Failed to parse signature');
    });

    it('should throw if not a PKCS#7 SignedData structure', async () => {
      // Create a valid ASN.1 ContentInfo with wrong contentType
      const contentInfo = new pkijs.ContentInfo({
        contentType: '1.2.3.4.5', // not PKCS#7
        content: new asn1js.Null(),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.parseSignature(b64)).rejects.toThrow('Failed to parse signature: Not a PKCS#7 SignedData structure');
    });
  });

  describe('getSignatureInfo', () => {
    it('should extract signature info', async () => {
      const info = await service.getSignatureInfo(sample1P7sB64);
      expect(info.subject.commonName).toBe('Anna Kowalski');
      expect(info.subject.organizationName).toBe('Liquio Test');
      expect(info.subject.countryName).toBe('UA');
      expect(info.issuer.commonName).toBe('Liquio Test CA');
      expect(info.issuer.organizationName).toBe('Liquio Test CA');
      expect(info.issuer.countryName).toBe('UA');
      expect(info.serial).toBe('1DD5E3F086BA70CFE146B5B76F56BA03730FBECC');
      expect(info.pem).toContain('BEGIN CERTIFICATE');

      // Normalize line endings for comparison
      const decodedExtracted = Buffer.from(info.content!, 'base64').toString('utf8').replace(/\r\n/g, '\n').trim();
      const decodedOriginal = sample1Json.toString('utf8').replace(/\r\n/g, '\n').trim();
      expect(decodedExtracted).toBe(decodedOriginal);
      if (info.signTime) {
        expect(new Date(info.signTime).toISOString()).toBe(info.signTime);
      } else {
        expect(info.signTime).toBeFalsy();
      }
    });

    it('should throw on invalid base64', async () => {
      await expect(service.getSignatureInfo('not-a-valid-base64')).rejects.toThrow(
        'Failed to parse or extract signature info: Failed to parse signature: ASN.1 parsing failed',
      );
    });

    it('should throw on invalid ASN.1', async () => {
      const badB64 = Buffer.from('hello world').toString('base64');
      await expect(service.getSignatureInfo(badB64)).rejects.toThrow(
        'Failed to parse or extract signature info: Failed to parse signature: ASN.1 parsing failed',
      );
    });

    it('should throw if not a PKCS#7 SignedData structure', async () => {
      await expect(service.getSignatureInfo(testPersonCrtB64)).rejects.toThrow(
        "Failed to parse or extract signature info: Failed to parse signature: Object's schema was not verified against input data for ContentInfo",
      );
    });

    it('should throw if signature is empty', async () => {
      await expect(service.getSignatureInfo('')).rejects.toThrow(
        'Failed to parse or extract signature info: Failed to parse signature: ASN.1 parsing failed',
      );
    });

    it('should throw if signature is not signed by a trusted CA', async () => {
      // Create a signature with a cert not signed by the trusted CA
      // Use the test-person cert as a self-signed cert (simulate by passing its PEM as base64)
      const badCertB64 = Buffer.from(testPersonCrtPem).toString('base64');
      await expect(service.getSignatureInfo(badCertB64)).rejects.toThrow(
        'Failed to parse or extract signature info: Failed to parse signature: ASN.1 parsing failed',
      );
    });

    it('should not allow a self-signed user to sign in', async () => {
      const certPath = path.join(__dirname, '__mocks__', 'test-person-2.cert.pem');
      const pem = fs.readFileSync(certPath, 'utf8');
      const pemB64 = Buffer.from(pem).toString('base64');
      await expect(service.getSignatureInfo(pemB64)).rejects.toThrow('Failed to parse or extract signature info: Failed to parse signature');
    });

    it('should throw if no signer certificate found in signature', async () => {
      // PKCS#7 with no certs
      const signerInfo = new pkijs.SignerInfo({
        sid: new pkijs.IssuerAndSerialNumber({
          issuer: new pkijs.RelativeDistinguishedNames(),
          serialNumber: new asn1js.Integer({
            valueHex: Buffer.from('01', 'hex'),
          }),
        }),
        digestAlgorithm: new pkijs.AlgorithmIdentifier({
          algorithmId: OID_PKCS7_SIGNED_DATA,
        }),
      });
      const signedData = new pkijs.SignedData({
        certificates: [],
        signerInfos: [signerInfo],
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: OID_PKCS7_SIGNED_DATA,
        }),
      });
      const contentInfo = new pkijs.ContentInfo({
        contentType: OID_PKCS7_SIGNED_DATA,
        content: signedData.toSchema(true),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.getSignatureInfo(b64)).rejects.toThrow('Failed to parse or extract signature info');
    });

    it('should throw if no signerInfo found in signature', async () => {
      // PKCS#7 with cert but no signerInfos
      const cert = pemToCert(testPersonCrtPem);
      const signedData = new pkijs.SignedData({
        certificates: [cert],
        signerInfos: [],
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: OID_PKCS7_SIGNED_DATA,
        }),
      });
      const contentInfo = new pkijs.ContentInfo({
        contentType: OID_PKCS7_SIGNED_DATA,
        content: signedData.toSchema(true),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.getSignatureInfo(b64)).rejects.toThrow('Failed to parse or extract signature info: No signerInfo found in signature');
    });
  });

  describe('verifyHash', () => {
    it('should return true for a valid signature and matching hash', async () => {
      const signedData = await service.parseSignature(sample1P7sB64);
      const contentBuffer = Buffer.from(signedData.encapContentInfo.eContent.valueBlock.valueHexView);
      const expectedHash = crypto.createHash('sha256').update(contentBuffer).digest('base64');
      const result = await service.verifyHash(expectedHash, sample1P7sB64);
      expect(result).toBe(true);
    });

    it('should return false if the hash does not match the signed content', async () => {
      const wrongHash = crypto.createHash('sha256').update('wrong').digest('base64');
      const result = await service.verifyHash(wrongHash, sample1P7sB64);
      expect(result).toBe(false);
    });

    it('should return false for an invalid base64 signature', async () => {
      const expectedHash = crypto.createHash('sha256').update(sample1Json).digest('base64');
      const result = await service.verifyHash(expectedHash, 'not-a-valid-base64');
      expect(result).toBe(false);
    });

    it('should return false for a signature that is not ASN.1', async () => {
      const expectedHash = crypto.createHash('sha256').update(sample1Json).digest('base64');
      const badB64 = Buffer.from('hello world').toString('base64');
      const result = await service.verifyHash(expectedHash, badB64);
      expect(result).toBe(false);
    });

    it('should return false for a signature that is not PKCS#7 SignedData', async () => {
      const expectedHash = crypto.createHash('sha256').update(sample1Json).digest('base64');
      const result = await service.verifyHash(expectedHash, testPersonCrtB64);
      expect(result).toBe(false);
    });

    it('should return false if signature is not signed by a trusted CA', async () => {
      // Use the test-person cert as a self-signed cert (simulate by passing its PEM as base64)
      const badCertB64 = Buffer.from(testPersonCrtPem).toString('base64');
      const expectedHash = crypto.createHash('sha256').update(sample1Json).digest('base64');
      const result = await service.verifyHash(expectedHash, badCertB64);
      expect(result).toBe(false);
    });

    it('should return false if signature is empty', async () => {
      const expectedHash = crypto.createHash('sha256').update(sample1Json).digest('base64');
      const result = await service.verifyHash(expectedHash, '');
      expect(result).toBe(false);
    });
  });

  describe('hashData', () => {
    it('should return correct hash (base64)', async () => {
      const data = Buffer.from('test').toString('base64');
      const expectedHash = crypto.createHash('sha256').update('test').digest('base64');
      const hash = await service.hashData(data, true);
      expect(hash).toBe(expectedHash);
    });

    it('should return correct hash (hex)', async () => {
      const data = Buffer.from('test').toString('base64');
      const expectedHash = crypto.createHash('sha256').update('test').digest('hex');
      const hash = await service.hashData(data, false);
      expect(hash).toBe(expectedHash);
    });

    it('should throw if data is not base64', async () => {
      await expect(service.hashData('not-base64', true)).rejects.toThrow();
    });
  });

  describe('CA trust boundaries', () => {
    it('should accept test-person-1 (signed by ca-1)', async () => {
      const sigPath = path.join(__dirname, '__mocks__', 'sample-1.json.p7s');
      const sigDer = fs.readFileSync(sigPath);
      const sigB64 = sigDer.toString('base64');
      await expect(service.getSignatureInfo(sigB64)).resolves.toBeDefined();
    });

    it('should reject test-person-3 (signed by ca-2)', async () => {
      const sigPath = path.join(__dirname, '__mocks__', 'sample-2.json.p7s');
      const sigDer = fs.readFileSync(sigPath);
      const sigB64 = sigDer.toString('base64');
      await expect(service.getSignatureInfo(sigB64)).rejects.toThrow('Failed to parse or extract signature info: Signature verification failed');
    });
  });

  describe('toPem', () => {
    it('should convert base64 to PEM format', () => {
      const service = new X509Service(
        { get: () => ({ caCerts: [] }) } as any,
        { setContext: () => {}, error: () => {}, log: () => {}, warn: () => {} } as any,
      );
      const base64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7';
      const expectedPem = '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7\n-----END CERTIFICATE-----';
      expect(service.toPem(base64)).toBe(expectedPem);
    });
  });
});

describe('X509Service signature verification', () => {
  let service: X509Service;
  let ca1Key: CryptoKey;
  let person1Key: CryptoKey;
  let person2Key: CryptoKey;
  let person1Cert: pkijs.Certificate;
  let person2Cert: pkijs.Certificate;
  const nonce = 'server-issued-nonce';

  beforeAll(async () => {
    const dir = path.join(__dirname, '__mocks__');
    ca1Key = await importKey(fs.readFileSync(path.join(dir, 'ca-1.key.pem'), 'utf8'));
    person1Key = await importKey(fs.readFileSync(path.join(dir, 'test-person-1.key.pem'), 'utf8'));
    person2Key = await importKey(fs.readFileSync(path.join(dir, 'test-person-2.key.pem'), 'utf8'));
    person1Cert = pemToCert(testPersonCrtPem);
    person2Cert = pemToCert(fs.readFileSync(path.join(dir, 'test-person-2.cert.pem'), 'utf8'));
  });

  beforeEach(async () => {
    fakeNow(FIXTURE_NOW);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        X509Service,
        { provide: ConfigurationService, useClass: MockConfigurationService },
        { provide: LoggerService, useClass: MockLoggerService },
      ],
    }).compile();
    service = module.get<X509Service>(X509Service);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts a genuine signature made with the signer private key over the nonce', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce });
    const info = await service.getSignatureInfo(cms);
    expect(Buffer.from(info.content!, 'base64').toString()).toBe(nonce);
    expect(info.subject.commonName).toBe('Anna Kowalski');
    await expect(service.verifyHash(sha256b64(nonce), cms)).resolves.toBe(true);
  });

  it('rejects a genuine trusted certificate with a signature made by another key (forged CMS)', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person2Key, content: nonce });
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
    await expect(service.verifyHash(sha256b64(nonce), cms)).resolves.toBe(false);
  });

  it('rejects a CMS whose embedded content was tampered after signing', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce, tamperContent: 'other-nonce' });
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
    await expect(service.verifyHash(sha256b64('other-nonce'), cms)).resolves.toBe(false);
  });

  it('rejects a CMS with a garbage signature value', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce, garbageSignature: true });
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
  });

  it('rejects a CMS whose signerInfo does not match any embedded certificate', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce, embedCerts: [person2Cert] });
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
  });

  it('rejects a valid signature of a self-signed (untrusted) certificate', async () => {
    const cms = await buildCms({ cert: person2Cert, key: person2Key, content: nonce });
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
  });

  it('rejects an expired signer certificate', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce });
    jest.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
    await expect(service.verifyHash(sha256b64(nonce), cms)).resolves.toBe(false);
  });

  it('rejects a not-yet-valid signer certificate', async () => {
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce });
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('Signature verification failed');
  });

  it('rejects a CA-issued certificate whose key usage does not allow signing', async () => {
    const { cert, key } = await issueCert({ caKey: ca1Key, keyUsageByte: 0x04 }); // keyCertSign only
    const cms = await buildCms({ cert, key, content: nonce });
    await expect(service.getSignatureInfo(cms)).rejects.toThrow('key usage');
  });

  it('accepts a CA-issued certificate with signing key usage', async () => {
    const { cert, key } = await issueCert({ caKey: ca1Key, keyUsageByte: 0x80 }); // digitalSignature
    const cms = await buildCms({ cert, key, content: nonce });
    await expect(service.getSignatureInfo(cms)).resolves.toBeDefined();
  });

  it('warns when no trusted CA is configured', () => {
    const warn = jest.fn();
    new X509Service({ get: () => ({ caCerts: [] }) } as any, { setContext: () => {}, error: () => {}, log: () => {}, warn } as any);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No trusted CA certificates configured'));
  });

  it('warns when the publicly known Liquio Test CA is trusted', () => {
    const warn = jest.fn();
    new X509Service({ get: () => ({ caCerts: [ca1CertPem] }) } as any, { setContext: () => {}, error: () => {}, log: () => {}, warn } as any);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Liquio Test CA'));
  });

  it('ships config templates without any trusted CA', () => {
    const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../config-templates/sign-tool/x509.json'), 'utf8'));
    expect(tpl.caCerts).toEqual([]);
  });

  it('fails closed when no trusted CA is configured', async () => {
    const empty = new X509Service(
      { get: () => ({ caCerts: [] }) } as any,
      { setContext: () => {}, error: () => {}, log: () => {}, warn: () => {} } as any,
    );
    const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce });
    await expect(empty.getSignatureInfo(cms)).rejects.toThrow('No trusted CA certificates configured');
  });

  describe('detached content', () => {
    it('verifies a detached signature against the supplied content', async () => {
      const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce, detached: true });
      const info = await service.getSignatureInfo(cms, Buffer.from(nonce).toString('base64'));
      expect(Buffer.from(info.content!, 'base64').toString()).toBe(nonce);
    });

    it('rejects a detached signature with different content', async () => {
      const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce, detached: true });
      await expect(service.getSignatureInfo(cms, Buffer.from('another').toString('base64'))).rejects.toThrow('Signature verification failed');
    });

    it('rejects a detached signature when no content is supplied', async () => {
      const cms = await buildCms({ cert: person1Cert, key: person1Key, content: nonce, detached: true });
      await expect(service.getSignatureInfo(cms)).rejects.toThrow('No signed content to verify');
    });
  });
});

function sha256b64(data: string) {
  return crypto.createHash('sha256').update(data).digest('base64');
}

function pemToCert(pem: string): pkijs.Certificate {
  const der = Buffer.from(pem.replace(/-----[^-]+-----|\s+/g, ''), 'base64');
  return new pkijs.Certificate({ schema: asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength)).result });
}

async function importKey(pem: string): Promise<CryptoKey> {
  const der = Buffer.from(pem.replace(/-----[^-]+-----|\s+/g, ''), 'base64');
  return pkijs.getCrypto(true).importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['sign']);
}

/**
 * Build a CMS SignedData signed with `key`, embedding `cert` (and optionally other certs).
 */
async function buildCms(opts: {
  cert: pkijs.Certificate;
  key: CryptoKey;
  content: string;
  detached?: boolean;
  tamperContent?: string;
  garbageSignature?: boolean;
  embedCerts?: pkijs.Certificate[];
}): Promise<string> {
  const contentBuf = Buffer.from(opts.content);
  const contentAb = contentBuf.buffer.slice(contentBuf.byteOffset, contentBuf.byteOffset + contentBuf.byteLength);
  const digest = crypto.createHash('sha256').update(contentBuf).digest();
  const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
    type: 0,
    attributes: [
      new pkijs.Attribute({ type: '1.2.840.113549.1.9.3', values: [new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.7.1' })] }),
      new pkijs.Attribute({ type: '1.2.840.113549.1.9.5', values: [new asn1js.UTCTime({ valueDate: new Date() })] }),
      new pkijs.Attribute({
        type: '1.2.840.113549.1.9.4',
        values: [new asn1js.OctetString({ valueHex: digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength) })],
      }),
    ],
  });
  const signedData = new pkijs.SignedData({
    version: 1,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({
      eContentType: '1.2.840.113549.1.7.1',
      ...(opts.detached ? {} : { eContent: new asn1js.OctetString({ valueHex: contentAb }) }),
    }),
    signerInfos: [
      new pkijs.SignerInfo({
        version: 1,
        sid: new pkijs.IssuerAndSerialNumber({ issuer: opts.cert.issuer, serialNumber: opts.cert.serialNumber }),
        signedAttrs,
      }),
    ],
    certificates: opts.embedCerts ?? [opts.cert],
  });
  await signedData.sign(opts.key, 0, 'SHA-256', contentAb);

  if (opts.garbageSignature) {
    signedData.signerInfos[0].signature = new asn1js.OctetString({ valueHex: crypto.randomBytes(256) });
  }
  if (opts.tamperContent) {
    const t = Buffer.from(opts.tamperContent);
    signedData.encapContentInfo.eContent = new asn1js.OctetString({ valueHex: t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength) });
  }

  const contentInfo = new pkijs.ContentInfo({ contentType: OID_PKCS7_SIGNED_DATA, content: signedData.toSchema(true) });
  return Buffer.from(contentInfo.toSchema().toBER(false)).toString('base64');
}

/**
 * Issue a certificate signed by the test CA with a fresh key and the given keyUsage first byte.
 */
async function issueCert(opts: { caKey: CryptoKey; keyUsageByte: number }): Promise<{ cert: pkijs.Certificate; key: CryptoKey }> {
  const subtle = pkijs.getCrypto(true);
  const keyPair = (await subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const caCert = pemToCert(ca1CertPem);
  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: Date.now() });
  cert.issuer = caCert.subject;
  cert.subject.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({ type: OID_COMMON_NAME, value: new asn1js.Utf8String({ value: 'Generated Person' }) }),
  );
  cert.notBefore.value = new Date('2025-12-01T00:00:00Z');
  cert.notAfter.value = new Date('2026-12-01T00:00:00Z');
  await cert.subjectPublicKeyInfo.importKey(keyPair.publicKey);
  const ku = new asn1js.BitString({ valueHex: new Uint8Array([opts.keyUsageByte]).buffer, unusedBits: 0 });
  cert.extensions = [new pkijs.Extension({ extnID: '2.5.29.15', critical: true, extnValue: ku.toBER(false), parsedValue: ku })];
  await cert.sign(opts.caKey, 'SHA-256');
  return { cert, key: keyPair.privateKey };
}
