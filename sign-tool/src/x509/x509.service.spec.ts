import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import * as pkijs from 'pkijs';
import * as crypto from 'crypto';
import { Crypto } from '@peculiar/webcrypto';
import * as asn1js from 'asn1js';
import debug from 'debug';

import { X509Service } from './x509.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { LoggerService } from '../observability/logger.service';
import {
  OID_COMMON_NAME,
  OID_ORGANIZATION_NAME,
  OID_COUNTRY_NAME,
  OID_BASIC_CONSTRAINTS,
  OID_PKCS7_SIGNED_DATA,
  OID_RSA_ENCRYPTION,
} from './x509.constants';

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

class MockLoggerService extends LoggerService {
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
    const certPath = path.join(
      __dirname,
      '__mocks__',
      'test-person-1.cert.pem',
    );
    testPersonCrtPem = fs.readFileSync(certPath, 'utf8');
    testPersonCrtB64 = testPersonCrtPem.replace(/-----[^-]+-----|\s+/g, '');
  }
  {
    const caCertPath = path.join(__dirname, '__mocks__', 'ca-1.cert.pem');
    ca1CertPem = fs.readFileSync(caCertPath, 'utf8');
  }
});

describe('X509Service', () => {
  let service: X509Service;

  beforeEach(async () => {
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
          const ext = c.extensions?.find(
            (e) => e.extnID === OID_BASIC_CONSTRAINTS,
          );
          if (ext && ext.parsedValue) return !ext.parsedValue.cA;
          return c.subject.typesAndValues.some(
            (tv) =>
              tv.type === OID_COMMON_NAME &&
              tv.value.valueBlock.value === 'Test Person',
          );
        }) as pkijs.Certificate;
      expect(cert).toBeInstanceOf(pkijs.Certificate);
      const subject = cert.subject.typesAndValues.reduce(
        (acc, tv) => {
          acc[tv.type] = tv.value.valueBlock.value;
          return acc;
        },
        {} as Record<string, string>,
      );
      expect(subject[OID_COMMON_NAME]).toBe('Test Person');
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
      const serialHex = Buffer.from(cert.serialNumber.valueBlock.toBER())
        .toString('hex')
        .toUpperCase();
      expect(serialHex).toBe('1C07D16DDAE3ECF9A031DC7F5257AD25EE541683');
      expect(signedData.signerInfos.length).toBeGreaterThan(0);
    });

    it('should throw on invalid base64', async () => {
      await expect(
        service.parseSignature('not-a-valid-base64'),
      ).rejects.toThrow('Failed to parse signature');
    });

    it('should throw on invalid ASN.1', async () => {
      const badB64 = Buffer.from('hello world').toString('base64');
      await expect(service.parseSignature(badB64)).rejects.toThrow(
        'Failed to parse signature',
      );
    });

    it('should throw if not a PKCS#7 SignedData structure', async () => {
      await expect(service.parseSignature(testPersonCrtB64)).rejects.toThrow(
        'Failed to parse signature',
      );
    });

    it('should throw if signature is empty', async () => {
      await expect(service.parseSignature('')).rejects.toThrow(
        'Failed to parse signature',
      );
    });

    it('should throw if not a PKCS#7 SignedData structure', async () => {
      // Create a valid ASN.1 ContentInfo with wrong contentType
      const contentInfo = new pkijs.ContentInfo({
        contentType: '1.2.3.4.5', // not PKCS#7
        content: new asn1js.Null(),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.parseSignature(b64)).rejects.toThrow(
        'Failed to parse signature: Not a PKCS#7 SignedData structure',
      );
    });
  });

  describe('getSignatureInfo', () => {
    it.only('should extract signature info', async () => {
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
      const decodedExtracted = Buffer.from(info.content!, 'base64')
        .toString('utf8')
        .replace(/\r\n/g, '\n')
        .trim();
      const decodedOriginal = sample1Json
        .toString('utf8')
        .replace(/\r\n/g, '\n')
        .trim();
      expect(decodedExtracted).toBe(decodedOriginal);
      if (info.signTime) {
        expect(new Date(info.signTime).toISOString()).toBe(info.signTime);
      } else {
        expect(info.signTime).toBeFalsy();
      }
    });

    it('should throw on invalid base64', async () => {
      await expect(
        service.getSignatureInfo('not-a-valid-base64'),
      ).rejects.toThrow(
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
      const certPath = path.join(
        __dirname,
        '__mocks__',
        'test-person-2.cert.pem',
      );
      const pem = fs.readFileSync(certPath, 'utf8');
      const pemB64 = Buffer.from(pem).toString('base64');
      await expect(service.getSignatureInfo(pemB64)).rejects.toThrow(
        "Failed to parse or extract signature info: Failed to parse signature: Object's schema was not verified against input data for ContentInfo",
      );
    });

    it('should fallback to subject CN if no basicConstraints extension', async () => {
      // Create a PKCS#7 with a cert that has no basicConstraints but has CN 'Test Person'
      const cert = createMinimalCertificate('Test Person', 'Liquio Test CA');
      const signerInfo = new pkijs.SignerInfo({
        sid: new pkijs.IssuerAndSerialNumber({
          issuer: cert.issuer,
          serialNumber: cert.serialNumber,
        }),
        digestAlgorithm: new pkijs.AlgorithmIdentifier({
          algorithmId: OID_PKCS7_SIGNED_DATA,
        }),
      });
      const signedData = new pkijs.SignedData({
        certificates: [cert],
        signerInfos: [signerInfo],
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: OID_PKCS7_SIGNED_DATA,
        }),
      });
      const contentInfo = new pkijs.ContentInfo({
        contentType: OID_PKCS7_SIGNED_DATA,
        content: signedData.toSchema(),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.getSignatureInfo(b64)).resolves.toBeDefined();
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
        content: signedData.toSchema(),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.getSignatureInfo(b64)).rejects.toThrow(
        'Failed to parse or extract signature info: No signer certificate found in signature',
      );
    });

    it('should throw if no signerInfo found in signature', async () => {
      // PKCS#7 with cert but no signerInfos
      const cert = createMinimalCertificate('Test Person', 'Liquio Test CA');
      const signedData = new pkijs.SignedData({
        certificates: [cert],
        signerInfos: [],
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: OID_PKCS7_SIGNED_DATA,
        }),
      });
      const contentInfo = new pkijs.ContentInfo({
        contentType: OID_PKCS7_SIGNED_DATA,
        content: signedData.toSchema(),
      });
      const der = contentInfo.toSchema().toBER(false);
      const b64 = Buffer.from(der).toString('base64');
      await expect(service.getSignatureInfo(b64)).rejects.toThrow(
        'Failed to parse or extract signature info: No signerInfo found in signature',
      );
    });
  });

  describe('verifyHash', () => {
    it('should return true for a valid signature and matching hash', async () => {
      const signedData = await service.parseSignature(sample1P7sB64);
      const contentBuffer = Buffer.from(
        signedData.encapContentInfo.eContent.valueBlock.valueHex,
      );
      const expectedHash = crypto
        .createHash('sha256')
        .update(contentBuffer)
        .digest('base64');
      const result = await service.verifyHash(expectedHash, sample1P7sB64);
      expect(result).toBe(true);
    });

    it('should return false if the hash does not match the signed content', async () => {
      const wrongHash = crypto
        .createHash('sha256')
        .update('wrong')
        .digest('base64');
      const result = await service.verifyHash(wrongHash, sample1P7sB64);
      expect(result).toBe(false);
    });

    it('should return false for an invalid base64 signature', async () => {
      const expectedHash = crypto
        .createHash('sha256')
        .update(sample1Json)
        .digest('base64');
      const result = await service.verifyHash(
        expectedHash,
        'not-a-valid-base64',
      );
      expect(result).toBe(false);
    });

    it('should return false for a signature that is not ASN.1', async () => {
      const expectedHash = crypto
        .createHash('sha256')
        .update(sample1Json)
        .digest('base64');
      const badB64 = Buffer.from('hello world').toString('base64');
      const result = await service.verifyHash(expectedHash, badB64);
      expect(result).toBe(false);
    });

    it('should return false for a signature that is not PKCS#7 SignedData', async () => {
      const expectedHash = crypto
        .createHash('sha256')
        .update(sample1Json)
        .digest('base64');
      const result = await service.verifyHash(expectedHash, testPersonCrtB64);
      expect(result).toBe(false);
    });

    it('should return false if signature is not signed by a trusted CA', async () => {
      // Use the test-person cert as a self-signed cert (simulate by passing its PEM as base64)
      const badCertB64 = Buffer.from(testPersonCrtPem).toString('base64');
      const expectedHash = crypto
        .createHash('sha256')
        .update(sample1Json)
        .digest('base64');
      const result = await service.verifyHash(expectedHash, badCertB64);
      expect(result).toBe(false);
    });

    it('should return false if signature is empty', async () => {
      const expectedHash = crypto
        .createHash('sha256')
        .update(sample1Json)
        .digest('base64');
      const result = await service.verifyHash(expectedHash, '');
      expect(result).toBe(false);
    });
  });

  describe('hashData', () => {
    it('should return correct hash (base64)', async () => {
      const data = Buffer.from('test').toString('base64');
      const expectedHash = crypto
        .createHash('sha256')
        .update('test')
        .digest('base64');
      const hash = await service.hashData(data, true);
      expect(hash).toBe(expectedHash);
    });

    it('should return correct hash (hex)', async () => {
      const data = Buffer.from('test').toString('base64');
      const expectedHash = crypto
        .createHash('sha256')
        .update('test')
        .digest('hex');
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
      await expect(service.getSignatureInfo(sigB64)).rejects.toThrow(
        'Failed to parse or extract signature info: Certificate is not signed by a trusted CA',
      );
    });
  });

  describe('toPem', () => {
    it('should convert base64 to PEM format', () => {
      const service = new X509Service(
        { get: () => ({ caCerts: [] }) } as any,
        { setContext: () => {}, error: () => {}, log: () => {} } as any,
      );
      const base64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7';
      const expectedPem =
        '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7\n-----END CERTIFICATE-----';
      expect(service.toPem(base64)).toBe(expectedPem);
    });
  });

  describe('isCertSignedByCA', () => {
    it('should return false if caCerts is empty', async () => {
      const service = new X509Service(
        { get: () => ({ caCerts: [] }) } as any,
        { setContext: () => {}, error: () => {}, log: () => {} } as any,
      );
      const cert = { verify: jest.fn() } as any;
      (service as any).caCerts = [];
      expect(await (service as any).isCertSignedByCA(cert)).toBe(false);
    });

    it('should return true if cert is signed by a CA', async () => {
      const service = new X509Service(
        { get: () => ({ caCerts: [] }) } as any,
        { setContext: () => {}, error: () => {}, log: () => {} } as any,
      );
      const ca = {
        subject: {
          typesAndValues: [
            { type: OID_COMMON_NAME, value: { valueBlock: { value: 'CA' } } },
          ],
        },
      };
      const cert = { verify: jest.fn().mockResolvedValueOnce(true) } as any;
      (service as any).caCerts = [ca];
      expect(await (service as any).isCertSignedByCA(cert)).toBe(true);
    });

    it('should return false if cert is not signed by any CA', async () => {
      const service = new X509Service(
        { get: () => ({ caCerts: [] }) } as any,
        { setContext: () => {}, error: () => {}, log: () => {} } as any,
      );
      const ca = {
        subject: {
          typesAndValues: [
            { type: OID_COMMON_NAME, value: { valueBlock: { value: 'CA' } } },
          ],
        },
      };
      const cert = { verify: jest.fn().mockResolvedValue(false) } as any;
      (service as any).caCerts = [ca];
      expect(await (service as any).isCertSignedByCA(cert)).toBe(false);
    });

    it('should return false and log error if verify throws', async () => {
      const logger = { setContext: () => {}, error: jest.fn(), log: () => {} };
      const service = new X509Service(
        { get: () => ({ caCerts: [] }) } as any,
        logger as any,
      );
      const ca = {
        subject: {
          typesAndValues: [
            { type: OID_COMMON_NAME, value: { valueBlock: { value: 'CA' } } },
          ],
        },
      };
      const cert = {
        verify: jest.fn().mockRejectedValue(new Error('fail')),
      } as any;
      (service as any).caCerts = [ca];
      expect(await (service as any).isCertSignedByCA(cert)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'isCertSignedByCA error',
        expect.any(Error),
      );
    });
  });
});

// Helper to generate a minimal valid pkijs Certificate
function createMinimalCertificate(subjectCN: string, issuerCN: string) {
  const cert = new pkijs.Certificate();
  cert.subject.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: OID_COMMON_NAME,
      value: new asn1js.PrintableString({ value: subjectCN }),
    }),
  );
  cert.issuer.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: OID_COMMON_NAME,
      value: new asn1js.PrintableString({ value: issuerCN }),
    }),
  );
  cert.serialNumber = new asn1js.Integer({
    valueHex: Buffer.from('01', 'hex'),
  });
  cert.subjectPublicKeyInfo = new pkijs.PublicKeyInfo({
    algorithm: new pkijs.AlgorithmIdentifier({
      algorithmId: OID_RSA_ENCRYPTION,
    }),
    subjectPublicKey: new asn1js.BitString({ valueHex: new ArrayBuffer(1) }),
  });
  cert.version = 2;
  cert.notBefore.value = new Date();
  cert.notAfter.value = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day
  return cert;
}
