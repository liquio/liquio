import axios, { AxiosInstance } from 'axios';

import { Helpers } from '../lib/helpers';
import { getTraceId } from '../middleware/async_local_storage';
import { BaseService } from './base_service';
import { typeOf } from '../lib/type_of';

// X.509 Signature Info Types (extracted from sign-tool)

export interface SignatureInfoPersonIdentifier {
  personIdentifier?: string;
}

export interface SignatureInfoSigner {
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
}

export interface SignatureInfoIssuer {
  commonName: string;
  organizationName?: string;
  organizationIdentifier?: string;
  countryName?: string;
  localityName?: string;
}

export interface SignatureInfoResponse {
  subject: SignatureInfoSigner;
  issuer: SignatureInfoIssuer;
  serial: string;
  signTime: string;
  content?: string;
  pem?: string;
}

export interface GetSignatureInfoDto {
  sign: string;
}

export interface VerifyHashDto {
  hash: string;
  sign: string;
}

export interface HashDataDto {
  data: string;
  isReturnAsBase64?: boolean;
}

export interface HashToInternalSignatureDto {
  hash: string;
  content?: string;
}

export const X509_OID = {
  OID_COMMON_NAME: '2.5.4.3',
  OID_SURNAME: '2.5.4.4',
  OID_GIVEN_NAME: '2.5.4.42',
  OID_INITIALS: '2.5.4.43',
  OID_SERIAL_NUMBER: '2.5.4.5',
  OID_ORGANIZATION_IDENTIFIER: '2.5.4.97',
  OID_ORGANIZATION_NAME: '2.5.4.10',
  OID_ORGANIZATIONAL_UNIT_NAME: '2.5.4.11',
};

export class X509Service extends BaseService {
  private readonly client: AxiosInstance;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    if (!this.config.x509?.externalUrl) {
      throw new Error('`config.x509.externalUrl` is not configured.');
    }

    const url = this.config.x509.externalUrl;

    this.client = axios.create({
      baseURL: url,
      timeout: this.config.x509.timeout ?? 10000,
    });
  }

  async init() {
    try {
      const response = await this.client.get('/test/ping');
      if (response.status !== 200) {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      this.log.save(`x509-service|init-error`, Helpers.prepareAxiosErrorToLog(error), 'error');
      throw new Error(`Sign-tool connection failed: ${error}`);
    }
  }

  /**
   * Get signature info.
   * @param sign Signature as Buffer or base64 string.
   * @returns SignatureInfoResponse
   */
  async getSignatureInfo(sign: Buffer | string): Promise<SignatureInfoResponse> {
    const signBase64 = typeof sign === 'string' ? sign : sign.toString('base64');

    try {
      const data = await this.post('/x509/signature-info', { sign: signBase64 });
      if (data.content) {
        data.content = Buffer.from(data.content, 'base64');
      }
      return data;
    } catch (error: any) {
      this.log.save(`x509-service|get-signature-info|error`, Helpers.prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  /**
   * Verify hash.
   */
  async verifyHash(hash: Buffer | string, sign: Buffer | string) {
    if (hash instanceof Buffer) {
      hash = hash.toString('base64');
    }

    if (sign instanceof Buffer) {
      sign = sign.toString('base64');
    }

    let result;
    try {
      result = await this.post('/x509/verify-hash', {
        hash,
        sign,
      });
    } catch (error: any) {
      this.log.save(`x509-service|verify-hash|error`, Helpers.prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
    return result;
  }

  /**
   * Obtain data chunk hash.
   */
  async hashData(data: Buffer | string, asBase64 = false): Promise<Buffer | string> {
    // We must pass data in base64 format only to the sign-tool service.
    let dataBase64;
    if (data instanceof Buffer) {
      dataBase64 = data.toString('base64');
    } else if (typeof data === 'string') {
      dataBase64 = Buffer.from(data, 'utf8').toString('base64');
    } else {
      const dataType = typeOf(data);
      this.log.save(`x509-service|hash-data|invalid-param-error`, { dataType }, 'error');
      throw new Error(`X509External.hashData: Invalid data type. Expected Buffer or string, but got ${dataType}.`);
    }

    let response;
    try {
      response = await this.post('/x509/hash-data', {
        data: dataBase64,
        isReturnAsBase64: true,
      });
    } catch (error: any) {
      this.log.save(`x509-service|hash-data|error`, Helpers.prepareAxiosErrorToLog(error), 'error');
      throw error;
    }

    if (asBase64) {
      return response;
    }

    return Buffer.from(response, 'base64');
  }

  async hashToInternalSignature(signedHash: Buffer | string, content: Buffer | string) {
    if (signedHash instanceof Buffer) {
      signedHash = signedHash.toString('base64');
    }

    if (content instanceof Buffer) {
      content = content.toString('base64');
    }

    try {
      return await this.post('/x509/hash-to-internal-signature', {
        hash: signedHash,
        content,
      });
    } catch (error: any) {
      this.log.save(`x509-service|hash-to-internal-signature|error`, Helpers.prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  async getSignersRNOKPP(signature: Buffer | string) {
    if (signature instanceof Buffer) {
      signature = signature.toString('base64');
    }

    try {
      return await this.post('/x509/signers-rnokpp', { signature });
    } catch (error: any) {
      this.log.save(`x509-service|get-signers-rnokpp|error`, Helpers.prepareAxiosErrorToLog(error), 'error');
      throw error;
    }
  }

  private async post(url: string, data: Buffer | string | Record<string, any>): Promise<any> {
    try {
      const headers = { 'x-trace-id': getTraceId() };
      const response = await this.client.post(url, data, { headers });
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message ?? error?.message ?? error.toString();
      this.log.save(`x509-service|post|error`, { url, error: message }, 'error');

      const err = new Error(`X509Service Error: ${message}`);
      if (error?.response?.status) {
        (err as any).status = error.response.status;
      }
      throw err;
    }
  }
}
