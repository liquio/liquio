import { Buffer } from 'buffer';
import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { Crypto } from '@peculiar/webcrypto';

import { ConfigurationService } from '../configuration/configuration.service';
import { LoggerService } from '../observability/logger.service';
import {
  OID_COMMON_NAME,
  OID_SURNAME,
  OID_GIVEN_NAME,
  OID_INITIALS,
  OID_ORGANIZATION_NAME,
  OID_ORGANIZATION_IDENTIFIER,
  OID_COUNTRY_NAME,
  OID_LOCALITY_NAME,
  OID_PERSON_IDENTIFIER,
  OID_SIGNING_TIME,
  OID_PKCS7_SIGNED_DATA,
  OID_KEY_USAGE,
  OID_SERIAL_NUMBER,
} from './x509.constants';

/**
 * Signature info from CMS/PKCS#7 signature
 * @see https://www.rfc-editor.org/rfc/rfc5652.html#section-5.4.4
 */
export interface SignatureInfo {
  subject: {
    commonName: string;
    surname?: string;
    givenName?: string;
    middleName?: string;
    organizationName?: string;
    organizationIdentifier?: string;
    countryName?: string;
    localityName?: string;
    personIdentifier?: string;
    serialNumber?: string;
  };
  issuer: {
    commonName: string;
    organizationName?: string;
    organizationIdentifier?: string;
    countryName?: string;
    localityName?: string;
  };
  serial: string;
  signTime: string;
  content?: string;
  pem?: string;
}

const TEST_CA_COMMON_NAME = 'Liquio Test CA';

@Injectable()
export class X509Service {
  private caCerts: pkijs.Certificate[] = [];

  constructor(
    private readonly config: ConfigurationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(X509Service.name);

    // Load CA certs from config
    const caCertsPem: string[] = this.config.get('x509')?.caCerts || [];
    this.caCerts = caCertsPem.map((pem) => {
      // Remove PEM headers/footers and whitespace
      const b64 = pem.replace(/-----[^-]+-----|\s+/g, '');
      const der = Buffer.from(b64, 'base64');
      const asn1 = asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength));
      const cert = new pkijs.Certificate({ schema: asn1.result });
      const caCN = cert.subject.typesAndValues.find((tv) => tv.type === OID_COMMON_NAME)?.value.valueBlock.value;
      this.logger.log(`Loaded CA cert: ${caCN}`);
      if (caCN === TEST_CA_COMMON_NAME) {
        this.logger.warn(
          `Trusting the publicly known "${TEST_CA_COMMON_NAME}": anyone can mint certificates accepted by this deployment. Use only in dev/test.`,
        );
      }
      return cert;
    });
    if (this.caCerts.length === 0) {
      this.logger.warn('No trusted CA certificates configured (x509.caCerts is empty): all x509 signature verification will be rejected.');
    }

    const webcrypto = new Crypto();
    const engine = new pkijs.CryptoEngine({
      name: 'webcrypto',
      crypto: webcrypto,
      subtle: webcrypto.subtle,
    });
    pkijs.setEngine('webcrypto', engine);
  }

  /**
   * Parse signature to raw data object
   * @param signature - base64-encoded CMS/PKCS#7 signature
   * @returns pkijs.SignedData object
   */
  async parseSignature(signature: string): Promise<pkijs.SignedData> {
    try {
      // 1. Decode base64 to Buffer
      const der = Buffer.from(signature, 'base64');

      // 2. Convert to ArrayBuffer (safe slice)
      const arrayBuffer = der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength);

      // 3. Parse ASN.1
      const asn1 = asn1js.fromBER(arrayBuffer);
      if (asn1.offset === -1) {
        throw new Error('ASN.1 parsing failed');
      }

      // 4. Parse ContentInfo (CMS/PKCS#7)
      const contentInfo = new pkijs.ContentInfo({ schema: asn1.result });
      if (contentInfo.contentType !== OID_PKCS7_SIGNED_DATA) {
        throw new Error('Not a PKCS#7 SignedData structure');
      }

      // 5. Parse SignedData
      return new pkijs.SignedData({ schema: contentInfo.content });
    } catch (e) {
      this.logger.error('parseSignature error', e);
      throw new Error('Failed to parse signature: ' + e.message);
    }
  }

  /**
   * Get signature info from CMS/PKCS#7 signature
   * @param signature - base64-encoded CMS/PKCS#7 signature
   * @param detachedContent - optional base64-encoded content, for signatures without embedded content
   * @returns Signature info
   */
  async getSignatureInfo(signature: string, detachedContent?: string): Promise<SignatureInfo> {
    try {
      const { signedData, signerCert, signerInfo } = await this.verifySignature(signature, detachedContent);

      // 3. Helper to extract fields by OID
      const getField = (obj: pkijs.RelativeDistinguishedNames, oid: string) => {
        const tv = obj.typesAndValues.find((tv) => tv.type === oid);
        return tv ? tv.value.valueBlock.value : undefined;
      };

      // 4. Parse subject and issuer
      const subject = signerCert.subject;
      const issuer = signerCert.issuer;

      // 5. Serial number
      const serial = Buffer.from(signerCert.serialNumber.valueBlock.toBER()).toString('hex').toUpperCase();

      // 6. Signing time (from signed attributes)
      let signTime = '';
      if (signerInfo.signedAttrs) {
        const signingTimeAttr = signerInfo.signedAttrs.attributes.find((attr) => attr.type === OID_SIGNING_TIME);
        if (signingTimeAttr && signingTimeAttr.values.length > 0) {
          // GeneralizedTime or UTCTime
          const timeBlock = signingTimeAttr.values[0].valueBlock;
          signTime = timeBlock.value.toISOString ? timeBlock.value.toISOString() : String(timeBlock.value);
        }
      }

      // 7. Content (embedded, or the verified detached one)
      let content: string | undefined = undefined;
      if (signedData.encapContentInfo.eContent) {
        content = this.getEmbeddedContent(signedData).toString('base64');
      } else if (detachedContent) {
        content = detachedContent;
      }

      // 8. PEM
      const rawCert = Buffer.from(signerCert.toSchema().toBER(false)).toString('base64');
      const pem = this.toPem(rawCert);

      // 9. Build result
      return {
        subject: {
          commonName: getField(subject, OID_COMMON_NAME),
          surname: getField(subject, OID_SURNAME),
          givenName: getField(subject, OID_GIVEN_NAME),
          middleName: getField(subject, OID_INITIALS),
          organizationName: getField(subject, OID_ORGANIZATION_NAME),
          organizationIdentifier: getField(subject, OID_ORGANIZATION_IDENTIFIER),
          countryName: getField(subject, OID_COUNTRY_NAME),
          localityName: getField(subject, OID_LOCALITY_NAME),
          personIdentifier: getField(subject, OID_PERSON_IDENTIFIER),
          serialNumber: getField(subject, OID_SERIAL_NUMBER),
        },
        issuer: {
          commonName: getField(issuer, OID_COMMON_NAME),
          organizationName: getField(issuer, OID_ORGANIZATION_NAME),
          organizationIdentifier: getField(issuer, OID_ORGANIZATION_IDENTIFIER),
          countryName: getField(issuer, OID_COUNTRY_NAME),
          localityName: getField(issuer, OID_LOCALITY_NAME),
        },
        serial,
        signTime,
        content,
        pem,
      };
    } catch (e) {
      this.logger.error('getSignatureInfo error', e);
      throw new Error('Failed to parse or extract signature info: ' + e.message);
    }
  }

  /**
   * Verify hash of the data to be signed
   * @param hash - hash of the data to be signed
   * @param signature - base64-encoded CMS/PKCS#7 signature
   * @returns true if the hash is valid, false otherwise
   */
  async verifyHash(hash: string, signature: string): Promise<boolean> {
    try {
      // Cryptographic verification (signature, chain, validity); throws on failure
      const { signedData } = await this.verifySignature(signature);

      // Extract the signed content (encapsulated content)
      if (!signedData.encapContentInfo.eContent) {
        this.logger.error('verifyHash: No encapsulated content in signature');
        return false;
      }

      // Hash the content using SHA-256
      const contentBuffer = this.getEmbeddedContent(signedData);
      const computedHash = crypto.createHash('sha256').update(contentBuffer).digest('base64');

      // Compare with provided hash (base64)
      return computedHash === hash;
    } catch (e) {
      this.logger.error('verifyHash error', e);
      return false;
    }
  }

  /**
   * Hash data using SHA-256
   * @param data - base64-encoded data to hash
   * @param isReturnAsBase64 - if true, return the hash as base64, otherwise return the hash as hex
   * @returns hash of the data as base64 or hex
   */
  async hashData(data: string, isReturnAsBase64?: boolean): Promise<string> {
    try {
      const buffer = Buffer.from(data, 'base64');
      // Check if the input was valid base64 (re-encode and compare, and not empty)
      if (!data || buffer.length === 0 || buffer.toString('base64').replace(/=+$/, '') !== data.replace(/=+$/, '')) {
        throw new Error('Input is not valid base64');
      }
      const hash = crypto.createHash('sha256').update(buffer).digest();
      return isReturnAsBase64 ? hash.toString('base64') : hash.toString('hex');
    } catch (e) {
      this.logger.error('hashData error', e);
      throw new Error('Failed to hash data: ' + e.message);
    }
  }

  /**
   * Hash to internal signature
   * @param hash - hash of the data to be signed
   * @param content - content of the data to be signed
   * @returns internal signature
   */
  async hashToInternalSignature(hash: string, content?: string): Promise<string> {
    try {
      // 1. Parse the external signature (PKCS#7 SignedData, detached)
      const signedData = await this.parseSignature(hash);

      // 2. Decode the content (base64)
      if (!content) {
        throw new Error('Content is required to create an internal signature');
      }
      const contentBuffer = Buffer.from(content, 'base64');

      // 3. Create a new SignedData object with embedded content
      const newSignedData = new pkijs.SignedData({
        certificates: signedData.certificates,
        signerInfos: signedData.signerInfos,
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: signedData.encapContentInfo.eContentType,
          // eContent will be set below
        }),
      });

      // Set eContent directly
      newSignedData.encapContentInfo.eContent = new asn1js.OctetString({
        valueHex: contentBuffer.buffer.slice(contentBuffer.byteOffset, contentBuffer.byteOffset + contentBuffer.byteLength),
      });

      // 4. Wrap in ContentInfo
      const contentInfo = new pkijs.ContentInfo({
        contentType: OID_PKCS7_SIGNED_DATA,
        content: newSignedData.toSchema(),
      });

      // 5. Encode as DER and return as base64
      const der = contentInfo.toSchema().toBER(false);
      return Buffer.from(der).toString('base64');
    } catch (e) {
      this.logger.error('hashToInternalSignature error', e);
      throw new Error('Failed to create internal signature: ' + (e.message || e));
    }
  }

  /**
   * Convert base64 to PEM
   * @param base64 - base64-encoded certificate
   * @returns PEM-encoded certificate
   */
  toPem(base64: string): string {
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
  }

  /**
   * Cryptographically verify a CMS/PKCS#7 SignedData and return the verified signer.
   * Checks the SignerInfo signature (incl. messageDigest over the content), that the
   * signer certificate chains to a configured trusted CA, that it is valid now and
   * that its key usage permits signing. Throws on any failure (fail closed).
   * @param signature - base64-encoded CMS/PKCS#7 signature
   * @param detachedContent - optional base64-encoded content for detached signatures
   */
  private async verifySignature(
    signature: string,
    detachedContent?: string,
  ): Promise<{ signedData: pkijs.SignedData; signerCert: pkijs.Certificate; signerInfo: pkijs.SignerInfo }> {
    const signedData = await this.parseSignature(signature);

    const signerInfo = signedData.signerInfos[0];
    if (!signerInfo) throw new Error('No signerInfo found in signature');
    if (signedData.signerInfos.length !== 1) throw new Error('Exactly one signerInfo is expected');
    if (!this.caCerts.length) throw new Error('No trusted CA certificates configured');

    const hasEmbeddedContent = Boolean(signedData.encapContentInfo.eContent);
    if (!hasEmbeddedContent && !detachedContent) throw new Error('No signed content to verify');

    let data: ArrayBuffer | undefined;
    if (!hasEmbeddedContent) {
      const buf = Buffer.from(detachedContent as string, 'base64');
      data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }

    let result: pkijs.SignedDataVerifyResult;
    try {
      result = await signedData.verify({
        signer: 0,
        data,
        trustedCerts: this.caCerts,
        checkChain: true,
        checkDate: new Date(),
        extendedMode: true,
      });
    } catch (e) {
      throw new Error('Signature verification failed: ' + (e?.message || e));
    }
    if (result.signatureVerified !== true || !result.signerCertificate) {
      throw new Error('Signature verification failed: ' + (result.message || 'signature is not valid'));
    }

    const signerCert = result.signerCertificate as pkijs.Certificate;
    this.assertKeyUsageAllowsSigning(signerCert);

    return { signedData, signerCert, signerInfo };
  }

  /**
   * Embedded content bytes, same view pkijs verifies (handles constructed/chunked OCTET STRING)
   */
  private getEmbeddedContent(signedData: pkijs.SignedData): Buffer {
    return Buffer.from((signedData.encapContentInfo.eContent as asn1js.OctetString).getValue());
  }

  /**
   * Require digitalSignature or nonRepudiation key usage, when the extension is present
   */
  private assertKeyUsageAllowsSigning(cert: pkijs.Certificate): void {
    const ext = cert.extensions?.find((e) => e.extnID === OID_KEY_USAGE);
    const bits = ext?.parsedValue?.valueBlock?.valueHex;
    if (!bits) return;
    const first = new Uint8Array(bits)[0] || 0;
    const digitalSignature = (first & 0x80) !== 0;
    const nonRepudiation = (first & 0x40) !== 0;
    if (!digitalSignature && !nonRepudiation) {
      throw new Error('Signer certificate key usage does not allow signing');
    }
  }
}
