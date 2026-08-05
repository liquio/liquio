import { Injectable } from '@nestjs/common';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';
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
  OID_BASIC_CONSTRAINTS,
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
      const asn1 = asn1js.fromBER(
        der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength),
      );
      const cert = new pkijs.Certificate({ schema: asn1.result });
      const caCN = cert.subject.typesAndValues.find(
        (tv) => tv.type === OID_COMMON_NAME,
      )?.value.valueBlock.value;
      this.logger.log(`Loaded CA cert: ${caCN}`);
      return cert;
    });

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
      const arrayBuffer = der.buffer.slice(
        der.byteOffset,
        der.byteOffset + der.byteLength,
      );

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
   * @returns Signature info
   */
  async getSignatureInfo(signature: string): Promise<SignatureInfo> {
    try {
      const signedData = await this.parseSignature(signature);

      // Find the signer certificate (not a CA)
      const signerCert = signedData.certificates
        .filter((c) => c instanceof pkijs.Certificate)
        .find((c) => {
          // Try to find basicConstraints extension
          const ext = c.extensions?.find(
            (e) => e.extnID === OID_BASIC_CONSTRAINTS,
          );
          if (ext && ext.parsedValue) {
            // pkijs parses extensions automatically
            return !ext.parsedValue.cA;
          }
          // Fallback: assume any non-CA cert is a signer
          return true;
        }) as pkijs.Certificate;
      if (!signerCert)
        throw new Error('No signer certificate found in signature');

      // CA validation
      if (!(await this.isCertSignedByCA(signerCert))) {
        throw new Error('Certificate is not signed by a trusted CA');
      }

      // 2. Get the first signerInfo
      const signerInfo = signedData.signerInfos[0];
      if (!signerInfo) throw new Error('No signerInfo found in signature');

      // 3. Helper to extract fields by OID
      const getField = (obj: pkijs.RelativeDistinguishedNames, oid: string) => {
        const tv = obj.typesAndValues.find((tv) => tv.type === oid);
        return tv ? tv.value.valueBlock.value : undefined;
      };

      // 4. Parse subject and issuer
      const subject = signerCert.subject;
      const issuer = signerCert.issuer;

      // 5. Serial number
      const serial = Buffer.from(signerCert.serialNumber.valueBlock.toBER())
        .toString('hex')
        .toUpperCase();

      // 6. Signing time (from signed attributes)
      let signTime = '';
      if (signerInfo.signedAttrs) {
        const signingTimeAttr = signerInfo.signedAttrs.attributes.find(
          (attr) => attr.type === OID_SIGNING_TIME,
        );
        if (signingTimeAttr && signingTimeAttr.values.length > 0) {
          // GeneralizedTime or UTCTime
          const timeBlock = signingTimeAttr.values[0].valueBlock;
          signTime = timeBlock.value.toISOString
            ? timeBlock.value.toISOString()
            : String(timeBlock.value);
        }
      }

      // 7. Content (if present)
      let content: string | undefined = undefined;
      if (signedData.encapContentInfo.eContent) {
        content = Buffer.from(
          signedData.encapContentInfo.eContent.valueBlock.valueHex,
        ).toString('base64');
      }

      // 8. PEM
      const rawCert = Buffer.from(signerCert.toSchema().toBER(false)).toString(
        'base64',
      );
      const pem = this.toPem(rawCert);

      // 9. Build result
      return {
        subject: {
          commonName: getField(subject, OID_COMMON_NAME),
          surname: getField(subject, OID_SURNAME),
          givenName: getField(subject, OID_GIVEN_NAME),
          middleName: getField(subject, OID_INITIALS),
          organizationName: getField(subject, OID_ORGANIZATION_NAME),
          organizationIdentifier: getField(
            subject,
            OID_ORGANIZATION_IDENTIFIER,
          ),
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
      throw new Error(
        'Failed to parse or extract signature info: ' + e.message,
      );
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
      const signedData = await this.parseSignature(signature);

      // Find the signer certificate (not a CA)
      const signerCert = signedData.certificates
        .filter((c) => c instanceof pkijs.Certificate)
        .find((c) => {
          // Try to find basicConstraints extension
          const ext = c.extensions?.find(
            (e) => e.extnID === OID_BASIC_CONSTRAINTS,
          );
          if (ext && ext.parsedValue) {
            // pkijs parses extensions automatically
            return !ext.parsedValue.cA;
          }
          // Fallback: assume any non-CA cert is a signer
          return true;
        }) as pkijs.Certificate;
      if (!signerCert)
        throw new Error('No signer certificate found in signature');

      // CA validation
      if (!(await this.isCertSignedByCA(signerCert))) {
        this.logger.error(
          'verifyHash: Certificate is not signed by a trusted CA',
        );
        return false;
      }

      // Extract the signed content (encapsulated content)
      if (!signedData.encapContentInfo.eContent) {
        this.logger.error('verifyHash: No encapsulated content in signature');
        return false;
      }

      // Hash the content using SHA-256
      const contentBuffer = Buffer.from(
        signedData.encapContentInfo.eContent.valueBlock.valueHex,
      );
      const computedHash = crypto
        .createHash('sha256')
        .update(contentBuffer)
        .digest('base64');

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
      if (
        !data ||
        buffer.length === 0 ||
        buffer.toString('base64').replace(/=+$/, '') !== data.replace(/=+$/, '')
      ) {
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
  async hashToInternalSignature(
    hash: string,
    content?: string,
  ): Promise<string> {
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
        valueHex: contentBuffer.buffer.slice(
          contentBuffer.byteOffset,
          contentBuffer.byteOffset + contentBuffer.byteLength,
        ),
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
      throw new Error(
        'Failed to create internal signature: ' + (e.message || e),
      );
    }
  }

  /**
   * Convert base64 to PEM
   * @param base64 - base64-encoded certificate
   * @returns PEM-encoded certificate
   */
  toPem(base64: string): string {
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN CERTIFICATE-----\n${lines.join(
      '\n',
    )}\n-----END CERTIFICATE-----`;
  }

  /**
   * Check if a certificate is signed by one of the loaded CA certs
   */
  private async isCertSignedByCA(cert: pkijs.Certificate): Promise<boolean> {
    let commonName: string;
    let serialNumber: string;
    try {
      commonName = cert.subject.typesAndValues.find(
        (tv) => tv.type === OID_COMMON_NAME,
      )?.value.valueBlock.value;

      serialNumber = cert.subject.typesAndValues.find(
        (tv) => tv.type === OID_SERIAL_NUMBER,
      )?.value.valueBlock.value;

      for (const ca of this.caCerts) {
        const caCN = ca.subject.typesAndValues.find(
          (tv) => tv.type === OID_COMMON_NAME,
        )?.value.valueBlock.value;

        const caSerial = Buffer.from(ca.serialNumber.valueBlock.toBER())
          .toString('hex')
          .toUpperCase();

        const result = await cert.verify(ca);
        if (result) {
          this.logger.log('is-cert-signed-by-ca|success', {
            commonName,
            serialNumber,
            signedBy: { caCN, caSerial },
          });
          return true;
        }
      }

      this.logger.warn('is-cert-signed-by-ca|warn', {
        commonName,
        serialNumber,
        message: 'Certificate is not signed by any trusted CA',
      });
      return false;
    } catch (e) {
      this.logger.error('is-cert-signed-by-ca|error', {
        commonName,
        serialNumber,
        error: e.message,
        stack: e.stack,
      });
      return false;
    }
  }
}
